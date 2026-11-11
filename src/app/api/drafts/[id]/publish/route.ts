import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { recordAuditEvent } from "@/lib/content/audit";
import { notifyDraftOwnerOrReviewers } from "@/lib/notifications";
import { getPlatformConnection } from "@/lib/platforms/store";
import { publishDraft } from "@/lib/agents/publishing/publisher";
import { decidePublishBranch } from "@/lib/agents/publishing/publish-decision";
import { refreshConnectionToken } from "@/lib/platforms/token-lifecycle";
import {
  dequeue,
  recordRetry,
  hasExceededRetries,
} from "@/lib/agents/publishing/scheduler";
import { validateDraftAgainstBrand } from "@/lib/brand/validation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("approve_content");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;

    const draft = await getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.status !== "scheduled" && draft.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot publish a draft with status "${draft.status}"` },
        { status: 422 }
      );
    }

    const validation = await validateDraftAgainstBrand({
      tenantId,
      draft,
      mode: "block",
    });
    if (!validation.compliance.canProceed) {
      return NextResponse.json(
        { error: "Draft failed brand compliance checks.", validation },
        { status: 422 }
      );
    }

    let connection = await getPlatformConnection(tenantId, draft.platform);
    if (connection?.tokenExpiresAt) {
      const msToExpiry = new Date(connection.tokenExpiresAt).getTime() - Date.now();
      if (msToExpiry <= 1000 * 60 * 60 * 24) {
        const refreshed = await refreshConnectionToken(connection);
        if (!refreshed.ok) {
          console.warn("[publish] token_pre_refresh_failed", {
            tenantId,
            platform: draft.platform,
            error: refreshed.error,
          });
        }
        connection = await getPlatformConnection(tenantId, draft.platform);
      }
    }
    const decision = decidePublishBranch(connection);
    if (decision.kind === "blocked") {
      return NextResponse.json(
        { error: "Connect this platform before publishing." },
        { status: 409 }
      );
    }
    const result = await publishDraft(draft, decision.connection);

    if (result.success) {
      const updated = await updateDraft(tenantId, id, {
        status: "published",
        publishedAt: result.publishedAt,
        platformPostId: result.platformPostId,
      });

      dequeue(id);

      recordAuditEvent({
        draftId: id,
        tenantId,
        action: "approve", // reusing approve action for publish audit
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email,
        fromStatus: draft.status,
        toStatus: "published",
        notes: `Published to ${draft.platform} (ID: ${result.platformPostId})`,
      });

      await notifyDraftOwnerOrReviewers({
        tenantId,
        draftId: id,
        actorId: session.user.id,
        type: "post_published",
        title: "Post published",
        message: `Draft successfully published to ${draft.platform}.`,
        link: "/approval",
      });

      return NextResponse.json({ draft: updated, result, validation });
    }

    // Handle failure — retry or mark as failed
    if (hasExceededRetries(id)) {
      const failed = await updateDraft(tenantId, id, { status: "failed" });
      dequeue(id);

      recordAuditEvent({
        draftId: id,
        tenantId,
        action: "revise",
        actorId: session.user.id,
        actorName: "Publisher Agent",
        fromStatus: draft.status,
        toStatus: "failed",
        notes: `Publish failed after max retries: ${result.error}`,
      });

      await notifyDraftOwnerOrReviewers({
        tenantId,
        draftId: id,
        actorId: session.user.id,
        type: "post_failed",
        title: "Publish failed",
        message: `Draft failed to publish to ${draft.platform}: ${result.error}`,
        link: "/approval",
      });

      return NextResponse.json({ draft: failed, result }, { status: 502 });
    }

    const retried = recordRetry(id, result.error ?? "Unknown error");

    return NextResponse.json(
      {
        error: "Publish failed, retrying",
        retryCount: retried?.retryCount,
        nextAttempt: retried?.scheduledAt,
        detail: result.error,
      },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to publish draft:", error);
    return NextResponse.json({ error: "Unable to publish draft" }, { status: 500 });
  }
}
