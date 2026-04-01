import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { collectAllMetrics, collectMetricsForDraft } from "@/lib/agents/analytics/collector";
import { getPlatformConnection } from "@/lib/platforms/store";
import { getDraftById } from "@/lib/content/store";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const tenantId = session.user.tenantId;

    let draftId: string | null = null;
    try {
      const body = (await request.json()) as { draftId?: unknown };
      if (typeof body.draftId === "string" && body.draftId.trim()) {
        draftId = body.draftId;
      }
    } catch {
      // No request body is valid for batch collection.
    }

    if (draftId) {
      const draft = await getDraftById(tenantId, draftId);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      if (draft.status !== "published") {
        return NextResponse.json(
          { error: "Only published drafts can be collected" },
          { status: 400 }
        );
      }

      const connection = getPlatformConnection(tenantId, draft.platform);
      const metric = await collectMetricsForDraft(draft, tenantId, connection);

      return NextResponse.json({
        ok: true,
        collected: 1,
        draftId,
        metricId: metric.id,
        message: `Collected analytics for draft ${draftId}.`,
      });
    }

    const count = await collectAllMetrics(tenantId, (platform) =>
      getPlatformConnection(tenantId, platform)
    );

    return NextResponse.json({
      ok: true,
      collected: count,
      message: `Collected metrics for ${count} published post(s).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to collect analytics:", error);
    return NextResponse.json({ error: "Unable to collect analytics" }, { status: 500 });
  }
}
