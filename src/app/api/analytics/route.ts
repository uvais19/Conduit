import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getDashboardOverview } from "@/lib/analytics/store";

export async function GET() {
  try {
    const session = await requirePermission("view_analytics");
    const overview = getDashboardOverview(session.user.tenantId);
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
