import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "@/lib/campaigns/store";
import { listDrafts } from "@/lib/content/store";
import { campaignUpdateSchema } from "@/lib/content/types";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/campaigns/[id] — campaign detail + drafts */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("edit_drafts");
    const { id } = await context.params;
    const campaign = await getCampaignById(session.user.tenantId, id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const drafts = await listDrafts({ tenantId: session.user.tenantId, campaignId: id });
    return NextResponse.json({ campaign, drafts, draftCount: drafts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch campaign:", error);
    return NextResponse.json({ error: "Unable to fetch campaign" }, { status: 500 });
  }
}

/** PATCH /api/campaigns/[id] */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("edit_drafts");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = campaignUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const campaign = await updateCampaign(session.user.tenantId, id, parsed.data);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to update campaign:", error);
    return NextResponse.json({ error: "Unable to update campaign" }, { status: 500 });
  }
}

/** DELETE /api/campaigns/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("edit_drafts");
    const { id } = await context.params;
    const ok = await deleteCampaign(session.user.tenantId, id);
    if (!ok) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to delete campaign:", error);
    return NextResponse.json({ error: "Unable to delete campaign" }, { status: 500 });
  }
}
