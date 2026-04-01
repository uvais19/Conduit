import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { recordAuditEvent, resolveTransition } from "@/lib/content/audit";
import { fireNotification } from "@/lib/notifications/store";

const bodySchema = z.object({
  notes: z.string().default(""),
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
    const notes = parsed.success ? parsed.data.notes : "";

    const draft = getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const toStatus = resolveTransition("approve", draft.status);
    if (!toStatus) {
      return NextResponse.json(
        { error: `Cannot approve a draft with status "${draft.status}"` },
        { status: 422 }
      );
    }

    const updated = updateDraft(tenantId, id, { status: toStatus });

    recordAuditEvent({
      draftId: id,
      tenantId,
      action: "approve",
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email,
      fromStatus: draft.status,
      toStatus,
      notes,
    });

    fireNotification({
      tenantId,
      type: "approved",
      draftId: id,
      actorName: session.user.name ?? session.user.email,
      message: `Draft approved by ${session.user.name ?? session.user.email}.`,
    });

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to approve draft:", error);
    return NextResponse.json({ error: "Unable to approve draft" }, { status: 500 });
  }
}
