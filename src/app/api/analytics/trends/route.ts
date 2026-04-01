import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getTrendData } from "@/lib/analytics/store";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const trends = getTrendData(session.user.tenantId, days);
    return NextResponse.json({ trends });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch trends:", error);
    return NextResponse.json({ error: "Unable to fetch trends" }, { status: 500 });
  }
}
