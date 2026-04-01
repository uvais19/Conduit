import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { recordAuditEvent } from "@/lib/content/audit";
import { fireNotification } from "@/lib/notifications/store";
import { enqueue, suggestPostingTime } from "@/lib/agents/publishing/scheduler";

const bodySchema = z.object({
  scheduledAt: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("approve_content");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    const requestedTime = parsed.success ? parsed.data.scheduledAt : undefined;

    const draft = getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot schedule a draft with status "${draft.status}". Draft must be approved first.` },
        { status: 422 }
      );
    }

    const scheduledAt = requestedTime
      ? new Date(requestedTime).toISOString()
      : suggestPostingTime(draft.platform).toISOString();

    const updated = updateDraft(tenantId, id, {
      status: "scheduled",
      scheduledAt,
    });

    enqueue({
      draftId: id,
      tenantId,
      platform: draft.platform,
      scheduledAt,
    });

    recordAuditEvent({
      draftId: id,
      tenantId,
      action: "submit", // reusing submit action type for scheduling audit
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email,
      fromStatus: "approved",
      toStatus: "scheduled",
      notes: `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    });

    fireNotification({
      tenantId,
      type: "submitted",
      draftId: id,
      actorName: session.user.name ?? session.user.email,
      message: `Draft scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
    });

    return NextResponse.json({ draft: updated, scheduledAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to schedule draft:", error);
    return NextResponse.json({ error: "Unable to schedule draft" }, { status: 500 });
  }
}
