import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { runVisualDesignerAgent } from "@/lib/agents/content/visual-designer";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { visualPlanRequestSchema } from "@/lib/content/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("edit_drafts");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = visualPlanRequestSchema.safeParse({
      ...body,
      draftId: body?.draftId || id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const draft = await getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const result = await runVisualDesignerAgent({
      draft,
      objective: parsed.data.objective,
      styleHint: parsed.data.styleHint,
    });

    const updated = await updateDraft(tenantId, id, {
      carousel: result.draftFields.carousel,
      storyTemplate: result.draftFields.storyTemplate,
      mediaType: result.draftFields.mediaType,
      visualPlanData: result.visualPlanData,
    });

    return NextResponse.json({ plan: result.plan, draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to build visual plan:", error);
    return NextResponse.json({ error: "Unable to build visual plan" }, { status: 500 });
  }
}
