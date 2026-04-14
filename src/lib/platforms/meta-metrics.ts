/**
 * Live analytics metrics from Meta Graph (Instagram + Facebook) for published drafts.
 */

import type { ContentDraftRecord } from "@/lib/content/types";
import type { PlatformConnection } from "@/lib/platforms/store";
import type { PostMetrics } from "@/lib/analytics/types";
import {
  metricsForFacebookPost,
  metricsForInstagramMedia,
} from "@/lib/platforms/meta-graph";

function engagementRateFrom(parts: {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}): number {
  const total =
    parts.likes +
    parts.comments +
    parts.shares +
    parts.saves +
    parts.clicks;
  if (parts.impressions <= 0) return 0;
  return Math.round((total / parts.impressions) * 10000) / 10000;
}

export async function fetchMetaRealMetrics(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<
  Omit<
    PostMetrics,
    "id" | "draftId" | "tenantId" | "platform" | "platformPostId" | "collectedAt"
  > | null
> {
  const postId = draft.platformPostId?.trim();
  if (!postId || postId.startsWith("sim_")) return null;

  try {
    if (draft.platform === "instagram") {
      const m = await metricsForInstagramMedia(postId, connection.accessToken);
      return {
        impressions: m.impressions,
        reach: m.reach,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
        clicks: m.clicks,
        engagementRate: engagementRateFrom(m),
        dataSource: "live",
      };
    }
    if (draft.platform === "facebook") {
      const m = await metricsForFacebookPost(postId, connection.accessToken);
      return {
        impressions: m.impressions,
        reach: m.reach,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
        clicks: m.clicks,
        engagementRate: engagementRateFrom(m),
        dataSource: "live",
      };
    }
  } catch {
    return null;
  }

  return null;
}
