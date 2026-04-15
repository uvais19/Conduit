import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getVariantComparisons } from "@/lib/analytics/store";
import { parseAnalyticsQueryFromUrl } from "@/lib/analytics/query";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const query = parseAnalyticsQueryFromUrl(new URL(request.url));
    const comparisons = await getVariantComparisons(session.user.tenantId, query);
    return NextResponse.json({ comparisons });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch variant comparisons:", error);
    return NextResponse.json({ error: "Unable to fetch comparisons" }, { status: 500 });
  }
}
