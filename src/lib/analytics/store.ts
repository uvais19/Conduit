import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { brandManifestos, contentDrafts, postAnalytics } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";
import type { ContentDraftRecord } from "@/lib/content/types";
import type {
  AnalyticsAttributionSummary,
  AnalyticsQuery,
  BestPostingWindow,
  PostMetrics,
  DashboardOverview,
  PlatformSummary,
  TopPost,
  VariantComparison,
  VariantMetrics,
  TrendPoint,
  EngagementAnomaly,
  FollowerGrowthPoint,
  ForecastPoint,
  HashtagPerformance,
  SentimentSummary,
} from "@/lib/analytics/types";
import { listDrafts, groupVariants } from "@/lib/content/store";

// ---------------------------------------------------------------------------
// In-memory metrics store (keyed by tenantId)
// ---------------------------------------------------------------------------

const metricsByTenant = new Map<string, PostMetrics[]>();

function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

type MetricRawPayload = {
  conduit?: { dataSource?: "live" | "simulated" };
} | null;

function mapMetricRow(
  row: typeof postAnalytics.$inferSelect,
  tenantId: string
): PostMetrics {
  const raw = row.rawData as MetricRawPayload;
  const dataSource =
    raw?.conduit?.dataSource === "live" || raw?.conduit?.dataSource === "simulated"
      ? raw.conduit.dataSource
      : "simulated";

  return {
    id: row.id,
    draftId: row.draftId,
    tenantId,
    platform: row.platform,
    platformPostId: row.platformPostId ?? "",
    collectedAt: row.collectedAt.toISOString(),
    impressions: row.impressions ?? 0,
    reach: row.reach ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    saves: row.saves ?? 0,
    clicks: row.clicks ?? 0,
    engagementRate: Number(row.engagementRate ?? 0),
    dataSource,
    rawData: row.rawData ?? undefined,
  };
}

function queryToDates(query?: AnalyticsQuery): { from?: Date; to?: Date } {
  const from = query?.from ? new Date(query.from) : undefined;
  const to = query?.to ? new Date(query.to) : undefined;
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };
}

function applyMetricFilters(metrics: PostMetrics[], query?: AnalyticsQuery): PostMetrics[] {
  const { from, to } = queryToDates(query);
  return metrics.filter((metric) => {
    const collectedAt = new Date(metric.collectedAt);
    if (from && collectedAt < from) return false;
    if (to && collectedAt > to) return false;
    if (query?.platforms?.length && !query.platforms.includes(metric.platform)) return false;
    return true;
  });
}

type AttributionStats = { visits: number; conversions: number; revenue: number };

function extractAttribution(rawData: unknown): AttributionStats {
  const payload = rawData as
    | { conduit?: { attribution?: Partial<AttributionStats> } }
    | undefined;
  const attribution = payload?.conduit?.attribution;
  return {
    visits: Number(attribution?.visits ?? 0),
    conversions: Number(attribution?.conversions ?? 0),
    revenue: Number(attribution?.revenue ?? 0),
  };
}

function formatWeekday(index: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index] ?? "N/A";
}

export async function recordMetrics(
  params: Omit<PostMetrics, "id" | "collectedAt">
): Promise<PostMetrics> {
  if (!isDbEnabled()) {
    const record: PostMetrics = {
      ...params,
      id: randomUUID(),
      collectedAt: new Date().toISOString(),
      dataSource: params.dataSource ?? "simulated",
    };

    const existing = metricsByTenant.get(params.tenantId) ?? [];
    metricsByTenant.set(params.tenantId, [record, ...existing]);
    return record;
  }

  const dataSource = params.dataSource ?? "simulated";

  const [created] = await db
    .insert(postAnalytics)
    .values({
      draftId: params.draftId,
      platform: params.platform,
      platformPostId: params.platformPostId,
      collectedAt: new Date(),
      impressions: params.impressions,
      reach: params.reach,
      likes: params.likes,
      comments: params.comments,
      shares: params.shares,
      saves: params.saves,
      clicks: params.clicks,
      engagementRate: params.engagementRate.toString(),
      rawData: { conduit: { dataSource } },
    })
    .returning();

  return mapMetricRow(created, params.tenantId);
}

export async function getMetricsForDraft(
  tenantId: string,
  draftId: string
): Promise<PostMetrics[]> {
  if (!isDbEnabled()) {
    const all = metricsByTenant.get(tenantId) ?? [];
    return all
      .filter((m) => m.draftId === draftId)
      .sort(
        (a, b) =>
          new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );
  }

  const rows = await db
    .select({ metric: postAnalytics })
    .from(postAnalytics)
    .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
    .where(
      and(
        eq(contentDrafts.tenantId, tenantId),
        eq(postAnalytics.draftId, draftId)
      )
    )
    .orderBy(desc(postAnalytics.collectedAt));

  return rows.map((row) => mapMetricRow(row.metric, tenantId));
}

export async function getLatestMetricsForDraft(
  tenantId: string,
  draftId: string
): Promise<PostMetrics | null> {
  const metrics = await getMetricsForDraft(tenantId, draftId);
  return metrics[0] ?? null;
}

// ---------------------------------------------------------------------------
// Dashboard aggregation
// ---------------------------------------------------------------------------

export async function getDashboardOverview(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<DashboardOverview> {
  const drafts = await listDrafts({ tenantId, status: "published" });
  const { from, to } = queryToDates(query);
  const allMetrics = isDbEnabled()
    ? (
        await db
          .select({ metric: postAnalytics })
          .from(postAnalytics)
          .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
          .where(
            and(
              eq(contentDrafts.tenantId, tenantId),
              from ? gte(postAnalytics.collectedAt, from) : undefined,
              to ? lte(postAnalytics.collectedAt, to) : undefined,
              query?.platforms?.length
                ? inArray(postAnalytics.platform, query.platforms)
                : undefined
            )
          )
      ).map((row) => mapMetricRow(row.metric, tenantId))
    : applyMetricFilters(metricsByTenant.get(tenantId) ?? [], query);

  // Get latest metrics per draft
  const latestByDraft = new Map<string, PostMetrics>();
  for (const m of allMetrics) {
    const existing = latestByDraft.get(m.draftId);
    if (!existing || new Date(m.collectedAt) > new Date(existing.collectedAt)) {
      latestByDraft.set(m.draftId, m);
    }
  }

  const latestMetrics = Array.from(latestByDraft.values());

  const totalImpressions = latestMetrics.reduce(
    (sum, m) => sum + m.impressions,
    0
  );
  const totalReach = latestMetrics.reduce((sum, m) => sum + m.reach, 0);
  const totalEngagements = latestMetrics.reduce(
    (sum, m) => sum + m.likes + m.comments + m.shares + m.saves + m.clicks,
    0
  );
  const avgEngagementRate =
    latestMetrics.length > 0
      ? latestMetrics.reduce((sum, m) => sum + m.engagementRate, 0) /
        latestMetrics.length
      : 0;

  // Platform breakdown
  const platformMap = new Map<Platform, PostMetrics[]>();
  for (const m of latestMetrics) {
    const list = platformMap.get(m.platform) ?? [];
    list.push(m);
    platformMap.set(m.platform, list);
  }

  const platformBreakdown: PlatformSummary[] = Array.from(
    platformMap.entries()
  ).map(([platform, metrics]) => ({
    platform,
    posts: metrics.length,
    impressions: metrics.reduce((s, m) => s + m.impressions, 0),
    reach: metrics.reduce((s, m) => s + m.reach, 0),
    engagements: metrics.reduce(
      (s, m) => s + m.likes + m.comments + m.shares + m.saves + m.clicks,
      0
    ),
    avgEngagementRate:
      metrics.reduce((s, m) => s + m.engagementRate, 0) / metrics.length,
  }));

  // Top posts by engagement rate
  const topPosts: TopPost[] = latestMetrics
    .map((m) => {
      const draft = drafts.find((d) => d.id === m.draftId);
      if (!draft) return null;
      return {
        draftId: m.draftId,
        platform: m.platform,
        pillar: draft.pillar,
        caption: draft.caption.slice(0, 120),
        variantLabel: draft.variantLabel,
        publishedAt: draft.publishedAt ?? draft.updatedAt,
        impressions: m.impressions,
        engagementRate: m.engagementRate,
      };
    })
    .filter((p): p is TopPost => p !== null)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 10);

  let live = 0;
  let simulated = 0;
  for (const m of latestMetrics) {
    if (m.dataSource === "live") live += 1;
    else simulated += 1;
  }

  return {
    totalPosts: drafts.length,
    totalImpressions,
    totalReach,
    totalEngagements,
    avgEngagementRate: Math.round(avgEngagementRate * 10000) / 10000,
    platformBreakdown,
    topPosts,
    metricsSourceBreakdown: { live, simulated },
  };
}

// ---------------------------------------------------------------------------
// Variant comparison
// ---------------------------------------------------------------------------

export async function getVariantComparisons(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<VariantComparison[]> {
  const publishedDrafts = await listDrafts({ tenantId, status: "published" });
  const groups = groupVariants(publishedDrafts);

  const comparisons = await Promise.all(
    groups.map(async (group) => {
      const variants = await Promise.all(
        (group.variants as ContentDraftRecord[]).map(async (draft) => {
          const points = applyMetricFilters(
            await getMetricsForDraft(tenantId, draft.id),
            query
          );
          const metrics = points[0] ?? null;
          if (!metrics) return null;
          return {
            draftId: draft.id,
            variantLabel: draft.variantLabel,
            impressions: metrics.impressions,
            reach: metrics.reach,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            saves: metrics.saves,
            clicks: metrics.clicks,
            engagementRate: metrics.engagementRate,
          } satisfies VariantMetrics;
        })
      );

      const filtered = variants.filter((v): v is VariantMetrics => v !== null);
      if (filtered.length === 0) return null;

      return {
        variantGroup: group.variantGroup,
        platform: group.platform as Platform,
        pillar: group.pillar as string,
        variants: filtered,
      } satisfies VariantComparison;
    })
  );

  return comparisons.filter((c): c is VariantComparison => c !== null);
}

// ---------------------------------------------------------------------------
// Trend data
// ---------------------------------------------------------------------------

export async function getTrendData(
  tenantId: string,
  days: number = 30,
  query?: AnalyticsQuery
): Promise<TrendPoint[]> {
  const { from, to } = queryToDates(query);
  const allMetrics = isDbEnabled()
    ? (
        await db
          .select({ metric: postAnalytics })
          .from(postAnalytics)
          .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
          .where(
            and(
              eq(contentDrafts.tenantId, tenantId),
              from ? gte(postAnalytics.collectedAt, from) : undefined,
              to ? lte(postAnalytics.collectedAt, to) : undefined,
              query?.platforms?.length
                ? inArray(postAnalytics.platform, query.platforms)
                : undefined
            )
          )
      ).map((row) => mapMetricRow(row.metric, tenantId))
    : applyMetricFilters(metricsByTenant.get(tenantId) ?? [], query);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Group metrics by date (YYYY-MM-DD)
  const byDate = new Map<string, PostMetrics[]>();
  for (const m of allMetrics) {
    if (new Date(m.collectedAt) < cutoff) continue;
    const dateKey = m.collectedAt.slice(0, 10);
    const list = byDate.get(dateKey) ?? [];
    list.push(m);
    byDate.set(dateKey, list);
  }

  const points: TrendPoint[] = Array.from(byDate.entries())
    .map(([date, metrics]) => {
      // Deduplicate — keep latest per draft for the day
      const latestPerDraft = new Map<string, PostMetrics>();
      for (const m of metrics) {
        const existing = latestPerDraft.get(m.draftId);
        if (
          !existing ||
          new Date(m.collectedAt) > new Date(existing.collectedAt)
        ) {
          latestPerDraft.set(m.draftId, m);
        }
      }
      const unique = Array.from(latestPerDraft.values());
      const engagements = unique.reduce(
        (s, m) => s + m.likes + m.comments + m.shares + m.saves + m.clicks,
        0
      );
      const avgRate =
        unique.length > 0
          ? unique.reduce((s, m) => s + m.engagementRate, 0) / unique.length
          : 0;

      return {
        date,
        impressions: unique.reduce((s, m) => s + m.impressions, 0),
        reach: unique.reduce((s, m) => s + m.reach, 0),
        engagements,
        engagementRate: Math.round(avgRate * 10000) / 10000,
        posts: unique.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

export async function getFollowerGrowth(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<FollowerGrowthPoint[]> {
  const trends = await getTrendData(tenantId, 90, query);
  const platforms = query?.platforms?.length
    ? query.platforms
    : (["instagram", "linkedin", "x"] as Platform[]);

  const platformSeries = new Map<Platform, number>();
  const points: FollowerGrowthPoint[] = [];
  for (const trend of trends) {
    for (const platform of platforms) {
      const baseline = platformSeries.get(platform) ?? 1000;
      // Follower proxy until all platform APIs expose direct follower snapshots.
      const increment = Math.max(0, Math.round(trend.reach * 0.0025));
      const next = baseline + increment;
      platformSeries.set(platform, next);
      points.push({ date: trend.date, platform, followers: next });
    }
  }
  return points;
}

export async function getHashtagAnalytics(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<HashtagPerformance[]> {
  const drafts = await listDrafts({ tenantId, status: "published" });
  const tagMap = new Map<
    string,
    { uses: number; impressions: number; engagements: number }
  >();

  for (const draft of drafts) {
    const latest = applyMetricFilters(
      await getMetricsForDraft(tenantId, draft.id),
      query
    )[0];
    if (!latest) continue;
    const engagements =
      latest.likes + latest.comments + latest.shares + latest.saves + latest.clicks;
    for (const tag of draft.hashtags) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      const item = tagMap.get(key) ?? { uses: 0, impressions: 0, engagements: 0 };
      item.uses += 1;
      item.impressions += latest.impressions;
      item.engagements += engagements;
      tagMap.set(key, item);
    }
  }

  return Array.from(tagMap.entries())
    .map(([hashtag, item]) => ({
      hashtag,
      uses: item.uses,
      impressions: item.impressions,
      engagements: item.engagements,
      avgEngagementRate:
        item.impressions > 0
          ? Math.round((item.engagements / item.impressions) * 10000) / 10000
          : 0,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 20);
}

export async function getBestPostingWindows(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<BestPostingWindow[]> {
  const allMetrics = applyMetricFilters(metricsByTenant.get(tenantId) ?? [], query);
  const metrics = isDbEnabled()
    ? applyMetricFilters(
        (
          await db
            .select({ metric: postAnalytics })
            .from(postAnalytics)
            .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
            .where(eq(contentDrafts.tenantId, tenantId))
        ).map((row) => mapMetricRow(row.metric, tenantId)),
        query
      )
    : allMetrics;

  const buckets = new Map<string, { sum: number; count: number; weekday: string; hour: number }>();
  for (const metric of metrics) {
    const collectedAt = new Date(metric.collectedAt);
    const weekday = formatWeekday(collectedAt.getDay());
    const hour = collectedAt.getHours();
    const key = `${weekday}-${hour}`;
    const bucket = buckets.get(key) ?? { sum: 0, count: 0, weekday, hour };
    bucket.sum += metric.engagementRate;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      weekday: bucket.weekday,
      hour: bucket.hour,
      avgEngagementRate: Math.round((bucket.sum / bucket.count) * 10000) / 10000,
      sampleSize: bucket.count,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 10);
}

export async function getEngagementAnomalies(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<EngagementAnomaly[]> {
  const trends = await getTrendData(tenantId, 60, query);
  if (trends.length < 8) return [];

  const anomalies: EngagementAnomaly[] = [];
  for (let i = 7; i < trends.length; i += 1) {
    const window = trends.slice(i - 7, i);
    const expected =
      window.reduce((sum, point) => sum + point.engagementRate, 0) / window.length;
    const current = trends[i].engagementRate;
    if (expected <= 0) continue;
    const deltaPercent = ((current - expected) / expected) * 100;
    if (deltaPercent <= -30 || deltaPercent >= 35) {
      anomalies.push({
        date: trends[i].date,
        currentEngagementRate: Math.round(current * 10000) / 10000,
        expectedEngagementRate: Math.round(expected * 10000) / 10000,
        deltaPercent: Math.round(deltaPercent * 100) / 100,
        severity: deltaPercent <= -45 || deltaPercent >= 50 ? "critical" : "warning",
      });
    }
  }
  return anomalies.slice(-12);
}

export async function getSentimentSummary(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<SentimentSummary> {
  const drafts = await listDrafts({ tenantId, status: "published" });
  const positiveLexicon = ["great", "love", "helpful", "awesome", "insightful"];
  const negativeLexicon = ["bad", "hate", "slow", "confusing", "problem"];

  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const draft of drafts) {
    const latest = applyMetricFilters(
      await getMetricsForDraft(tenantId, draft.id),
      query
    )[0];
    if (!latest) continue;

    const text = `${draft.caption} ${draft.hashtags.join(" ")}`.toLowerCase();
    const pos = positiveLexicon.some((word) => text.includes(word));
    const neg = negativeLexicon.some((word) => text.includes(word));
    if (pos && !neg) positive += 1;
    else if (neg && !pos) negative += 1;
    else neutral += 1;
  }

  const total = positive + neutral + negative;
  const score = total > 0 ? (positive - negative) / total : 0;
  return { positive, neutral, negative, score: Math.round(score * 100) / 100 };
}

export async function getEngagementForecast(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<ForecastPoint[]> {
  const trends = await getTrendData(tenantId, 30, query);
  if (trends.length < 3) return [];

  const ys = trends.map((point) => point.engagementRate);
  const xs = ys.map((_, index) => index + 1);
  const xAvg = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yAvg = ys.reduce((a, b) => a + b, 0) / ys.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i += 1) {
    numerator += (xs[i] - xAvg) * (ys[i] - yAvg);
    denominator += (xs[i] - xAvg) ** 2;
  }
  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = yAvg - slope * xAvg;

  const points: ForecastPoint[] = [];
  const lastDate = new Date(trends[trends.length - 1].date);
  for (let i = 1; i <= 7; i += 1) {
    const nextX = xs.length + i;
    const pred = Math.max(0, intercept + slope * nextX);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i);
    points.push({
      date: nextDate.toISOString().slice(0, 10),
      predictedEngagementRate: Math.round(pred * 10000) / 10000,
      lowerBound: Math.max(0, Math.round((pred * 0.85) * 10000) / 10000),
      upperBound: Math.round((pred * 1.15) * 10000) / 10000,
    });
  }
  return points;
}

export async function getAttributionSummary(
  tenantId: string,
  query?: AnalyticsQuery
): Promise<AnalyticsAttributionSummary> {
  const allMetrics = isDbEnabled()
    ? (
        await db
          .select({ metric: postAnalytics })
          .from(postAnalytics)
          .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
          .where(eq(contentDrafts.tenantId, tenantId))
      ).map((row) => mapMetricRow(row.metric, tenantId))
    : metricsByTenant.get(tenantId) ?? [];
  const filtered = applyMetricFilters(allMetrics, query);

  const latestByDraft = new Map<string, PostMetrics>();
  for (const metric of filtered) {
    const existing = latestByDraft.get(metric.draftId);
    if (!existing || new Date(metric.collectedAt) > new Date(existing.collectedAt)) {
      latestByDraft.set(metric.draftId, metric);
    }
  }

  let visits = 0;
  let conversions = 0;
  let revenue = 0;
  for (const metric of latestByDraft.values()) {
    const attribution = extractAttribution(metric.rawData);
    visits += attribution.visits;
    conversions += attribution.conversions;
    revenue += attribution.revenue;
  }
  return {
    trackedPosts: latestByDraft.size,
    visits,
    conversions,
    revenue,
    conversionRate: visits > 0 ? Math.round((conversions / visits) * 10000) / 10000 : 0,
  };
}

export async function recordConversionForDraft(params: {
  tenantId: string;
  draftId: string;
  visits: number;
  conversions: number;
  revenue?: number;
}): Promise<AnalyticsAttributionSummary> {
  const latest = await getLatestMetricsForDraft(params.tenantId, params.draftId);
  if (!latest) {
    throw new Error("No analytics metric found for draft");
  }

  const existing = extractAttribution(latest.rawData);
  const next = {
    visits: existing.visits + Math.max(0, params.visits),
    conversions: existing.conversions + Math.max(0, params.conversions),
    revenue: existing.revenue + Math.max(0, params.revenue ?? 0),
  };

  if (isDbEnabled()) {
    const rows = await db
      .select({ metric: postAnalytics })
      .from(postAnalytics)
      .where(eq(postAnalytics.id, latest.id))
      .limit(1);
    const rawData = (rows[0]?.metric.rawData as Record<string, unknown> | null) ?? {};
    const conduit = (rawData.conduit as Record<string, unknown> | undefined) ?? {};
    conduit.attribution = next;
    await db
      .update(postAnalytics)
      .set({ rawData: { ...rawData, conduit } })
      .where(eq(postAnalytics.id, latest.id));
  } else {
    const tenantMetrics = metricsByTenant.get(params.tenantId) ?? [];
    const target = tenantMetrics.find((metric) => metric.id === latest.id);
    if (target) {
      target.rawData = {
        conduit: { attribution: next },
      };
    }
  }

  return await getAttributionSummary(params.tenantId);
}

export function buildUtmLink(params: {
  destinationUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}): string {
  const url = new URL(params.destinationUrl);
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  if (params.term) url.searchParams.set("utm_term", params.term);
  if (params.content) url.searchParams.set("utm_content", params.content);
  return url.toString();
}

export async function getAudienceBreakdown(tenantId: string): Promise<{
  demographics: string;
  psychographics: string;
}> {
  if (!isDbEnabled()) {
    return {
      demographics: "Audience demographics available with database-backed brand manifesto.",
      psychographics: "Audience psychographics available with database-backed brand manifesto.",
    };
  }

  const [manifesto] = await db
    .select()
    .from(brandManifestos)
    .where(eq(brandManifestos.tenantId, tenantId))
    .orderBy(desc(brandManifestos.updatedAt))
    .limit(1);

  const data = manifesto?.data as
    | { primaryAudience?: { demographics?: string; psychographics?: string } }
    | undefined;
  return {
    demographics: data?.primaryAudience?.demographics ?? "Not available",
    psychographics: data?.primaryAudience?.psychographics ?? "Not available",
  };
}
