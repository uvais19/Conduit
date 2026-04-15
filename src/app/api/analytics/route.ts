import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getDashboardOverview } from "@/lib/analytics/store";
import { parseAnalyticsQueryFromUrl } from "@/lib/analytics/query";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const query = parseAnalyticsQueryFromUrl(new URL(request.url));
    const overview = await getDashboardOverview(session.user.tenantId, query);
    return NextResponse.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Unable to fetch analytics" }, { status: 500 });
  }
}
