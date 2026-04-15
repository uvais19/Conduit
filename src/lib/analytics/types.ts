import type { Platform } from "@/lib/types";
import type { VariantLabel } from "@/lib/content/types";

export type PostMetrics = {
  id: string;
  draftId: string;
  tenantId: string;
  platform: Platform;
  platformPostId: string;
  collectedAt: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  /** Live platform API vs internal simulation */
  dataSource?: "live" | "simulated";
  /** Optional reason when simulation fallback is used */
  fallbackReason?: string | null;
};

export type DashboardOverview = {
  totalPosts: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  avgEngagementRate: number;
  platformBreakdown: PlatformSummary[];
  topPosts: TopPost[];
  /** Counts of latest metric rows by source (per published draft) */
  metricsSourceBreakdown: { live: number; simulated: number };
};

export type PlatformSummary = {
  platform: Platform;
  posts: number;
  impressions: number;
  reach: number;
  engagements: number;
  avgEngagementRate: number;
};

export type TopPost = {
  draftId: string;
  platform: Platform;
  pillar: string;
  caption: string;
  variantLabel: VariantLabel;
  publishedAt: string;
  impressions: number;
  engagementRate: number;
};

export type VariantComparison = {
  variantGroup: string;
  platform: Platform;
  pillar: string;
  variants: VariantMetrics[];
};

export type VariantMetrics = {
  draftId: string;
  variantLabel: VariantLabel;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagementRate: number;
};

export type TrendPoint = {
  date: string;
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: number;
  posts: number;
};
