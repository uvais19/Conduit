import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { recordAuditEvent } from "@/lib/content/audit";
import { fireNotification } from "@/lib/notifications/store";
import { getPlatformConnection } from "@/lib/platforms/store";
import { publishDraft, simulatePublish } from "@/lib/agents/publishing/publisher";
import {
  dequeue,
  recordRetry,
  hasExceededRetries,
} from "@/lib/agents/publishing/scheduler";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("approve_content");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;

    const draft = getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.status !== "scheduled" && draft.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot publish a draft with status "${draft.status}"` },
        { status: 422 }
      );
    }

    // Try real publish if platform is connected, otherwise simulate
    const connection = getPlatformConnection(tenantId, draft.platform);
    const result = connection
      ? await publishDraft(draft, connection)
      : await simulatePublish(draft);

    if (result.success) {
      const updated = updateDraft(tenantId, id, {
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
        notes: connection
          ? `Published to ${draft.platform} (ID: ${result.platformPostId})`
          : `Simulated publish (ID: ${result.platformPostId})`,
      });

      fireNotification({
        tenantId,
        type: "submitted",
        draftId: id,
        actorName: "Publisher Agent",
        message: `Draft successfully published to ${draft.platform}.`,
      });

      return NextResponse.json({ draft: updated, result });
    }

    // Handle failure — retry or mark as failed
    if (hasExceededRetries(id)) {
      const failed = updateDraft(tenantId, id, { status: "failed" });
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

      fireNotification({
        tenantId,
        type: "submitted",
        draftId: id,
        actorName: "Publisher Agent",
        message: `Draft failed to publish to ${draft.platform}: ${result.error}`,
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
