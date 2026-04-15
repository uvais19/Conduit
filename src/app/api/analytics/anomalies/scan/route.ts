import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getEngagementAnomalies } from "@/lib/analytics/store";
import { fireNotification } from "@/lib/notifications/store";
import { logActivity } from "@/lib/audit-log";

const lastAlertByTenant = new Map<string, string>();
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export async function POST() {
  try {
    const session = await requirePermission("view_analytics");
    const tenantId = session.user.tenantId;
    const anomalies = await getEngagementAnomalies(tenantId);
    if (anomalies.length === 0) {
      return NextResponse.json({ alerted: false, anomalies: [] });
    }

    const latest = anomalies[anomalies.length - 1];
    const now = Date.now();
    const last = lastAlertByTenant.get(tenantId);
    if (last && now - new Date(last).getTime() < COOLDOWN_MS) {
      return NextResponse.json({
        alerted: false,
        anomalies,
        reason: "cooldown_active",
      });
    }

    fireNotification({
      tenantId,
      draftId: "anomaly-monitor",
      type: "submitted",
      actorName: "Analytics Monitor",
      message: `Engagement anomaly detected (${latest.deltaPercent}% on ${latest.date}).`,
    });
    await logActivity({
      tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "anomaly",
      metadata: latest,
    });
    lastAlertByTenant.set(tenantId, new Date(now).toISOString());

    return NextResponse.json({ alerted: true, anomalies, latest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Unable to scan anomalies" },
      { status: 500 }
    );
  }
}
