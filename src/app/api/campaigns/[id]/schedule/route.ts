import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getCampaignForTenant, scheduleApprovedCampaignDrafts } from "@/lib/campaigns/store";

const bodySchema = z.object({
  startAt: z.string().min(1),
  hoursBetween: z.number().min(1).max(168).default(24),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("approve_content");
    const tenantId = session.user.tenantId;
    const { id: campaignId } = await context.params;

    const campaign = await getCampaignForTenant(tenantId, campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const startAt = new Date(parsed.data.startAt);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
    }

    const result = await scheduleApprovedCampaignDrafts({
      tenantId,
      campaignId,
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email,
      startAt,
      hoursBetween: parsed.data.hoursBetween,
    });

    return NextResponse.json({
      campaignId,
      ...result,
      message:
        result.scheduled.length === 0
          ? "No approved drafts in this campaign to schedule."
          : `Scheduled ${result.scheduled.length} draft(s).`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
