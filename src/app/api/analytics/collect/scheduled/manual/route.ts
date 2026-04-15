import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { collectAllMetrics } from "@/lib/agents/analytics/collector";
import { getPlatformConnection } from "@/lib/platforms/store";
import { logActivity } from "@/lib/audit-log";

export async function POST() {
  try {
    const session = await requirePermission("view_analytics");
    const tenantId = session.user.tenantId;
    const collected = await collectAllMetrics(tenantId, (platform) =>
      getPlatformConnection(tenantId, platform)
    );

    await logActivity({
      tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "analytics",
      metadata: { mode: "scheduled-manual-trigger", collected },
    });

    return NextResponse.json({
      ok: true,
      collected,
      mode: "scheduled-manual-trigger",
      message: `Scheduled analytics pipeline processed ${collected} post(s).`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Unable to run scheduled analytics pipeline." },
      { status: 500 }
    );
  }
}
