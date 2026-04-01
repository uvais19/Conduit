import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { contentDrafts, postAnalytics } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";
import type { ContentDraftRecord, VariantLabel } from "@/lib/content/types";
import type {
  PostMetrics,
  DashboardOverview,
  PlatformSummary,
  TopPost,
  VariantComparison,
  VariantMetrics,
  TrendPoint,
} from "@/lib/analytics/types";
import { listDrafts, groupVariants } from "@/lib/content/store";

// ---------------------------------------------------------------------------
// In-memory metrics store (keyed by tenantId)
// ---------------------------------------------------------------------------

const metricsByTenant = new Map<string, PostMetrics[]>();

function useDb() {
  return Boolean(process.env.DATABASE_URL);
}

function mapMetricRow(
  row: typeof postAnalytics.$inferSelect,
  tenantId: string
): PostMetrics {
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
  };
}

export async function recordMetrics(
  params: Omit<PostMetrics, "id" | "collectedAt">
): Promise<PostMetrics> {
  if (!useDb()) {
    const record: PostMetrics = {
      ...params,
      id: randomUUID(),
      collectedAt: new Date().toISOString(),
    };

    const existing = metricsByTenant.get(params.tenantId) ?? [];
    metricsByTenant.set(params.tenantId, [record, ...existing]);
    return record;
  }

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
      rawData: null,
    })
    .returning();

  return mapMetricRow(created, params.tenantId);
}

export async function getMetricsForDraft(
  tenantId: string,
  draftId: string
): Promise<PostMetrics[]> {
  if (!useDb()) {
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
  tenantId: string
): Promise<DashboardOverview> {
  const drafts = await listDrafts({ tenantId, status: "published" });
  const allMetrics = useDb()
    ? (
        await db
          .select({ metric: postAnalytics })
          .from(postAnalytics)
          .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
          .where(eq(contentDrafts.tenantId, tenantId))
      ).map((row) => mapMetricRow(row.metric, tenantId))
    : metricsByTenant.get(tenantId) ?? [];

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

  return {
    totalPosts: drafts.length,
    totalImpressions,
    totalReach,
    totalEngagements,
    avgEngagementRate: Math.round(avgEngagementRate * 10000) / 10000,
    platformBreakdown,
    topPosts,
  };
}

// ---------------------------------------------------------------------------
// Variant comparison
// ---------------------------------------------------------------------------

export async function getVariantComparisons(
  tenantId: string
): Promise<VariantComparison[]> {
  const publishedDrafts = await listDrafts({ tenantId, status: "published" });
  const groups = groupVariants(publishedDrafts);

  const comparisons = await Promise.all(
    groups.map(async (group) => {
      const variants = await Promise.all(
        (group.variants as ContentDraftRecord[]).map(async (draft) => {
          const metrics = await getLatestMetricsForDraft(tenantId, draft.id);
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
  days: number = 30
): Promise<TrendPoint[]> {
  const allMetrics = useDb()
    ? (
        await db
          .select({ metric: postAnalytics })
          .from(postAnalytics)
          .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
          .where(eq(contentDrafts.tenantId, tenantId))
      ).map((row) => mapMetricRow(row.metric, tenantId))
    : metricsByTenant.get(tenantId) ?? [];
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
