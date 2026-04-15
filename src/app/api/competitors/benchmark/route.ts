import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listCompetitors } from "@/lib/optimization/store";
import { getDashboardOverview } from "@/lib/analytics/store";

function parseWeeklyFrequency(input: string): number | null {
  const lower = input.toLowerCase();
  const range = lower.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
  }
  const single = lower.match(/(\d+)/);
  if (!single) return null;
  const value = Number(single[1]);
  if (!Number.isFinite(value)) return null;
  if (lower.includes("day")) return value * 7;
  return value;
}

export async function GET() {
  try {
    const { user } = await requireAuth();
    const tenantId = user.tenantId;
    const [competitors, overview] = await Promise.all([
      listCompetitors(tenantId),
      getDashboardOverview(tenantId),
    ]);

    const analyzed = competitors.filter((c) => c.analysisData);
    const avgCompetitorEngagement =
      analyzed.length > 0
        ? analyzed.reduce((sum, c) => sum + (c.analysisData?.engagementRate ?? 0), 0) /
          analyzed.length
        : 0;
    const ownEngagement = overview.avgEngagementRate;
    const engagementDelta = ownEngagement - avgCompetitorEngagement;

    const cadenceSamples = analyzed
      .map((c) => parseWeeklyFrequency(c.analysisData?.postingFrequency ?? ""))
      .filter((value): value is number => value !== null);
    const avgCompetitorPostsPerWeek =
      cadenceSamples.length > 0
        ? cadenceSamples.reduce((sum, value) => sum + value, 0) / cadenceSamples.length
        : 0;

    return NextResponse.json({
      benchmark: {
        analyzedCompetitors: analyzed.length,
        yourAvgEngagementRate: ownEngagement,
        competitorAvgEngagementRate: avgCompetitorEngagement,
        engagementDelta,
        avgCompetitorPostsPerWeek,
        yourPublishedPosts: overview.totalPosts,
      },
    });
  } catch (error) {
    console.error("Failed to compute competitor benchmark:", error);
    return NextResponse.json(
      { error: "Unable to compute competitor benchmark" },
      { status: 500 }
    );
  }
}
