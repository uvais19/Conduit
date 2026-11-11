import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { recordAuditEvent, resolveTransition } from "@/lib/content/audit";
import { notifyDraftOwnerOrReviewers } from "@/lib/notifications";

const bodySchema = z.object({
  notes: z.string().min(1, "Revision notes are required"),
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

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { notes } = parsed.data;

    const draft = await getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const toStatus = resolveTransition("revise", draft.status);
    if (!toStatus) {
      return NextResponse.json(
        { error: `Cannot request revision for a draft with status "${draft.status}"` },
        { status: 422 }
      );
    }

    const updated = await updateDraft(tenantId, id, { status: toStatus });

    recordAuditEvent({
      draftId: id,
      tenantId,
      action: "revise",
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email,
      fromStatus: draft.status,
      toStatus,
      notes,
    });

    await notifyDraftOwnerOrReviewers({
      tenantId,
      draftId: id,
      actorId: session.user.id,
      type: "revision_requested",
      title: "Revision requested",
      message: `Revision requested by ${session.user.name ?? session.user.email}: ${notes}`,
      link: "/approval",
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
    console.error("Failed to request revision:", error);
    return NextResponse.json({ error: "Unable to request revision" }, { status: 500 });
  }
}
