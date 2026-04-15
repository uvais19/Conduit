import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { parseAnalyticsQueryFromUrl } from "@/lib/analytics/query";
import {
  getAttributionSummary,
  getAudienceBreakdown,
  getBestPostingWindows,
  getEngagementAnomalies,
  getEngagementForecast,
  getFollowerGrowth,
  getHashtagAnalytics,
  getSentimentSummary,
} from "@/lib/analytics/store";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const query = parseAnalyticsQueryFromUrl(new URL(request.url));
    const tenantId = session.user.tenantId;

    const [
      audience,
      followerGrowth,
      hashtags,
      bestWindows,
      anomalies,
      sentiment,
      forecast,
      attribution,
    ] = await Promise.all([
      getAudienceBreakdown(tenantId),
      getFollowerGrowth(tenantId, query),
      getHashtagAnalytics(tenantId, query),
      getBestPostingWindows(tenantId, query),
      getEngagementAnomalies(tenantId, query),
      getSentimentSummary(tenantId, query),
      getEngagementForecast(tenantId, query),
      getAttributionSummary(tenantId, query),
    ]);

    return NextResponse.json({
      audience,
      followerGrowth,
      hashtags,
      bestWindows,
      anomalies,
      sentiment,
      forecast,
      attribution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch analytics insights:", error);
    return NextResponse.json(
      { error: "Unable to fetch analytics insights" },
      { status: 500 },
    );
  }
}
