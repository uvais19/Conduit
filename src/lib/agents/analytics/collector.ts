/**
 * Analytics Agent — Collector
 *
 * Pulls metrics for published posts from each platform's analytics API.
 * When real platform credentials are unavailable, generates realistic
 * simulated metrics for development and demo flows.
 *
 * Collection schedule per the blueprint:
 *   - 24 hours after publishing
 *   - 48 hours after publishing
 *   - 7 days after publishing
 * Each pull creates a new metrics row (time-series).
 */

import type { Platform } from "@/lib/types";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { PlatformConnection } from "@/lib/platforms/store";
import { recordMetrics } from "@/lib/analytics/store";
import type { PostMetrics } from "@/lib/analytics/types";
import { fetchMetaRealMetrics } from "@/lib/platforms/meta-metrics";
import { fetchLinkedInMetrics } from "@/lib/platforms/linkedin-api";
import { fetchXTweetMetrics } from "@/lib/platforms/x-api";
import { fetchGbpPostMetrics } from "@/lib/platforms/gbp-api";

// ---------------------------------------------------------------------------
// Simulated metrics generation
// ---------------------------------------------------------------------------

/** Platform-aware base ranges for realistic simulation */
const PLATFORM_RANGES: Record<
  Platform,
  {
    impressions: [number, number];
    reachRatio: [number, number];
    likeRate: [number, number];
    commentRate: [number, number];
    shareRate: [number, number];
    saveRate: [number, number];
    clickRate: [number, number];
  }
> = {
  instagram: {
    impressions: [500, 8000],
    reachRatio: [0.6, 0.85],
    likeRate: [0.03, 0.08],
    commentRate: [0.005, 0.02],
    shareRate: [0.002, 0.015],
    saveRate: [0.01, 0.04],
    clickRate: [0.005, 0.015],
  },
  facebook: {
    impressions: [300, 5000],
    reachRatio: [0.5, 0.75],
    likeRate: [0.02, 0.06],
    commentRate: [0.003, 0.015],
    shareRate: [0.005, 0.025],
    saveRate: [0.001, 0.005],
    clickRate: [0.008, 0.02],
  },
  linkedin: {
    impressions: [200, 4000],
    reachRatio: [0.7, 0.9],
    likeRate: [0.02, 0.05],
    commentRate: [0.005, 0.02],
    shareRate: [0.003, 0.015],
    saveRate: [0.002, 0.008],
    clickRate: [0.01, 0.03],
  },
  x: {
    impressions: [400, 10000],
    reachRatio: [0.4, 0.7],
    likeRate: [0.01, 0.04],
    commentRate: [0.002, 0.01],
    shareRate: [0.005, 0.03],
    saveRate: [0.001, 0.005],
    clickRate: [0.005, 0.015],
  },
  gbp: {
    impressions: [100, 2000],
    reachRatio: [0.8, 0.95],
    likeRate: [0.01, 0.03],
    commentRate: [0.002, 0.008],
    shareRate: [0.001, 0.005],
    saveRate: [0.001, 0.003],
    clickRate: [0.02, 0.05],
  },
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function simulateMetrics(
  platform: Platform,
  hoursAfterPublish: number
): Omit<
  PostMetrics,
  "id" | "draftId" | "tenantId" | "platform" | "platformPostId" | "collectedAt"
> {
  const ranges = PLATFORM_RANGES[platform];

  // Metrics grow with time — apply a multiplier based on hours elapsed
  const growthFactor = Math.min(1, hoursAfterPublish / 168); // max at 7 days
  const timeMul = 0.3 + 0.7 * growthFactor;

  const impressions = randInt(
    ranges.impressions[0] * timeMul,
    ranges.impressions[1] * timeMul
  );
  const reach = Math.round(impressions * rand(...ranges.reachRatio));
  const likes = Math.round(impressions * rand(...ranges.likeRate));
  const comments = Math.round(impressions * rand(...ranges.commentRate));
  const shares = Math.round(impressions * rand(...ranges.shareRate));
  const saves = Math.round(impressions * rand(...ranges.saveRate));
  const clicks = Math.round(impressions * rand(...ranges.clickRate));

  const totalEngagements = likes + comments + shares + saves + clicks;
  const engagementRate =
    impressions > 0
      ? Math.round((totalEngagements / impressions) * 10000) / 10000
      : 0;

  return {
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    clicks,
    engagementRate,
    dataSource: "simulated",
  };
}

// ---------------------------------------------------------------------------
// Real API stubs (per-platform)
// ---------------------------------------------------------------------------

async function fetchRealMetrics(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<
  | Omit<
      PostMetrics,
      "id" | "draftId" | "tenantId" | "platform" | "platformPostId" | "collectedAt"
    >
  | null
> {
  if (!connection.accessToken?.trim()) return null;
  const meta = await fetchMetaRealMetrics(draft, connection);
  if (meta) return meta;
  const postId = draft.platformPostId?.trim();
  if (!postId || postId.startsWith("sim_")) return null;

  if (draft.platform === "linkedin" && connection.platformUserId?.trim()) {
    const authorUrn = connection.platformUserId.startsWith("urn:")
      ? connection.platformUserId
      : `urn:li:person:${connection.platformUserId}`;
    const postUrn = postId.startsWith("urn:") ? postId : `urn:li:share:${postId}`;
    const m = await fetchLinkedInMetrics({
      accessToken: connection.accessToken,
      authorUrn,
      postUrn,
    });
    const impressions = Math.max(1, m.impressions);
    return {
      ...m,
      engagementRate:
        Math.round(
          ((m.likes + m.comments + m.shares + m.saves + m.clicks) / impressions) * 10000
        ) / 10000,
      dataSource: "live",
    };
  }

  if (draft.platform === "x") {
    const m = await fetchXTweetMetrics({
      accessToken: connection.accessToken,
      tweetId: postId,
    });
    const impressions = Math.max(1, m.impressions);
    return {
      ...m,
      engagementRate:
        Math.round(
          ((m.likes + m.comments + m.shares + m.saves + m.clicks) / impressions) * 10000
        ) / 10000,
      dataSource: "live",
    };
  }

  if (draft.platform === "gbp" && connection.platformPageId?.trim()) {
    const m = await fetchGbpPostMetrics({
      accessToken: connection.accessToken,
      locationName: connection.platformPageId,
      localPostName: postId,
    });
    const impressions = Math.max(1, m.impressions);
    return {
      ...m,
      engagementRate:
        Math.round(
          ((m.likes + m.comments + m.shares + m.saves + m.clicks) / impressions) * 10000
        ) / 10000,
      dataSource: "live",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main collection function
// ---------------------------------------------------------------------------

export async function collectMetricsForDraft(
  draft: ContentDraftRecord,
  tenantId: string,
  connection: PlatformConnection | null
): Promise<PostMetrics> {
  const hoursAfterPublish = draft.publishedAt
    ? (Date.now() - new Date(draft.publishedAt).getTime()) / 3_600_000
    : 24;

  let metrics: Omit<PostMetrics, "id" | "draftId" | "tenantId" | "platform" | "platformPostId" | "collectedAt">;
  let fallbackReason: string | null = null;

  if (connection) {
    try {
      const real = await fetchRealMetrics(draft, connection);
      if (real) {
        metrics = real;
      } else {
        fallbackReason = draft.platformPostId?.startsWith("sim_")
          ? "simulated_publish_id"
          : "missing_live_metric_preconditions";
        metrics = simulateMetrics(draft.platform, hoursAfterPublish);
      }
    } catch (error) {
      fallbackReason = error instanceof Error ? `metrics_error:${error.message}` : "metrics_error:unknown";
      metrics = simulateMetrics(draft.platform, hoursAfterPublish);
    }
  } else {
    fallbackReason = "missing_platform_connection";
    metrics = simulateMetrics(draft.platform, hoursAfterPublish);
  }

  return await recordMetrics({
    draftId: draft.id,
    tenantId,
    platform: draft.platform,
    platformPostId: draft.platformPostId ?? "",
    fallbackReason,
    ...metrics,
  });
}

/**
 * Batch-collect metrics for all published drafts in a tenant.
 * Returns the number of drafts for which metrics were collected.
 */
export async function collectAllMetrics(
  tenantId: string,
  getConnection: (platform: Platform) => PlatformConnection | null
): Promise<number> {
  // Import here to avoid circular dependency at module level
  const { listDrafts } = await import("@/lib/content/store");
  const published = await listDrafts({ tenantId, status: "published" });

  let count = 0;
  for (const draft of published) {
    const connection = getConnection(draft.platform);
    await collectMetricsForDraft(draft, tenantId, connection);
    count++;
  }

  return count;
}
