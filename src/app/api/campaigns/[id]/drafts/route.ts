import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { assignDraftsToCampaign } from "@/lib/campaigns/store";
import { campaignAssignDraftsSchema } from "@/lib/content/types";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/campaigns/[id]/drafts — assign drafts to this campaign */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("edit_drafts");
    const { id: campaignId } = await context.params;
    const body = await request.json();
    const parsed = campaignAssignDraftsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    try {
      const assigned = await assignDraftsToCampaign(
        session.user.tenantId,
        campaignId,
        parsed.data.draftIds
      );
      return NextResponse.json({ ok: true, assigned });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("not found")) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      throw e;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to assign drafts:", error);
    return NextResponse.json({ error: "Unable to assign drafts" }, { status: 500 });
  }
}
