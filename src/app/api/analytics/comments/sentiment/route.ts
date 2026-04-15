import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { upsertCommentSamplesForDraft } from "@/lib/analytics/store";
import { logActivity } from "@/lib/audit-log";

const requestSchema = z.object({
  draftId: z.string().min(1),
  comments: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sentiment payload" },
        { status: 400 }
      );
    }

    await upsertCommentSamplesForDraft({
      tenantId: session.user.tenantId,
      draftId: parsed.data.draftId,
      comments: parsed.data.comments,
    });
    await logActivity({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "comment-sentiment",
      resourceId: parsed.data.draftId,
      metadata: { sampleCount: parsed.data.comments.length },
    });
    return NextResponse.json({ ok: true, sampleCount: parsed.data.comments.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "No analytics metric found for draft") {
      return NextResponse.json(
        { error: "Collect analytics for this draft before ingesting comments." },
        { status: 404 }
      );
    }
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Unable to ingest comment samples" },
      { status: 500 }
    );
  }
}
