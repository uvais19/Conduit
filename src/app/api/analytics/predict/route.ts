import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { getBestPostingWindows, getHashtagAnalytics } from "@/lib/analytics/store";

const requestSchema = z.object({
  platform: z.enum(["instagram", "facebook", "linkedin", "x", "gbp"]),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  scheduledAt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid prediction request" },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;
    const { platform, caption, hashtags, scheduledAt } = parsed.data;
    const [windows, hashtagStats] = await Promise.all([
      getBestPostingWindows(tenantId, { platforms: [platform] }),
      getHashtagAnalytics(tenantId, { platforms: [platform] }),
    ]);

    const captionScore = Math.min(1, caption.length / 220);
    const hashtagMatches = hashtags
      .map((tag) => hashtagStats.find((item) => item.hashtag === tag.toLowerCase()))
      .filter(Boolean);
    const hashtagScore =
      hashtagMatches.length > 0
        ? hashtagMatches.reduce((sum, tag) => sum + (tag?.avgEngagementRate ?? 0), 0) /
          hashtagMatches.length
        : 0.03;

    let timingScore = 0.05;
    if (scheduledAt && windows.length > 0) {
      const candidate = new Date(scheduledAt);
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        candidate.getDay()
      ];
      const hour = candidate.getHours();
      const matching = windows.find((window) => window.weekday === weekday && window.hour === hour);
      timingScore = matching?.avgEngagementRate ?? windows[0]?.avgEngagementRate ?? timingScore;
    } else if (windows.length > 0) {
      timingScore = windows[0].avgEngagementRate;
    }

    const predictedEngagementRate = Math.min(
      0.3,
      Math.max(0.01, captionScore * 0.08 + hashtagScore * 0.5 + timingScore * 0.42)
    );

    return NextResponse.json({
      prediction: {
        predictedEngagementRate: Math.round(predictedEngagementRate * 10000) / 10000,
        confidence:
          windows.length >= 10 && hashtagStats.length >= 15
            ? "high"
            : windows.length >= 5
              ? "medium"
              : "low",
        factors: {
          captionScore: Math.round(captionScore * 100) / 100,
          hashtagScore: Math.round(hashtagScore * 10000) / 10000,
          timingScore: Math.round(timingScore * 10000) / 10000,
        },
      },
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
      { error: "Unable to generate engagement prediction" },
      { status: 500 }
    );
  }
}
