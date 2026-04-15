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
  rawData?: unknown;
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

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  platforms?: Platform[];
};

export type AnalyticsAttributionSummary = {
  trackedPosts: number;
  visits: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
};

export type FollowerGrowthPoint = {
  date: string;
  platform: Platform;
  followers: number;
};

export type HashtagPerformance = {
  hashtag: string;
  uses: number;
  impressions: number;
  engagements: number;
  avgEngagementRate: number;
};

export type BestPostingWindow = {
  weekday: string;
  hour: number;
  avgEngagementRate: number;
  sampleSize: number;
};

export type EngagementAnomaly = {
  date: string;
  currentEngagementRate: number;
  expectedEngagementRate: number;
  deltaPercent: number;
  severity: "warning" | "critical";
};

export type SentimentSummary = {
  positive: number;
  neutral: number;
  negative: number;
  score: number;
};

export type ForecastPoint = {
  date: string;
  predictedEngagementRate: number;
  lowerBound: number;
  upperBound: number;
};
