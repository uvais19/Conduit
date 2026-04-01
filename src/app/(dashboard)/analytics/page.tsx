"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { DashboardOverview, TrendPoint, VariantComparison } from "@/lib/analytics/types";
import { VariantComparisonView } from "@/components/variant-comparison-view";
import { TrendCharts } from "@/components/trend-charts";
import { PerPostAnalyticsDetail } from "@/components/per-post-analytics-detail";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [comparisons, setComparisons] = useState<VariantComparison[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState<7 | 30>(30);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function fetchOverview() {
    const response = await fetch("/api/analytics");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load analytics overview");
    setOverview(data.overview as DashboardOverview);
  }

  async function fetchComparisons() {
    const response = await fetch("/api/analytics/variants");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load variant comparisons");
    setComparisons((data.comparisons as VariantComparison[]) ?? []);
  }

  async function fetchTrends(nextDays: 7 | 30) {
    const response = await fetch(`/api/analytics/trends?days=${nextDays}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load trend data");
    setTrends((data.trends as TrendPoint[]) ?? []);
  }

  async function refreshAll(nextDays: 7 | 30 = days) {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchOverview(), fetchComparisons(), fetchTrends(nextDays)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (!overview) return;
    if (overview.topPosts.length === 0) {
      setSelectedDraftId(null);
      return;
    }
    if (!selectedDraftId || !overview.topPosts.find((p) => p.draftId === selectedDraftId)) {
      setSelectedDraftId(overview.topPosts[0]?.draftId ?? null);
    }
  }, [overview, selectedDraftId]);

  const chartData = useMemo(() => {
    return (overview?.platformBreakdown ?? []).map((item) => ({
      platform: PLATFORM_LABELS[item.platform],
      impressions: item.impressions,
      engagements: item.engagements,
    }));
  }, [overview]);

  async function collectAnalytics() {
    setCollecting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/analytics/collect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to collect analytics");
      setNotice(data.message ?? "Analytics collected successfully.");
      await refreshAll(days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to collect analytics");
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Performance overview, top-performing posts, and variant insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 7 | 30)}
          >
            <option value={7}>Weekly (7 days)</option>
            <option value={30}>Monthly (30 days)</option>
          </select>
          <Button onClick={() => void collectAnalytics()} disabled={collecting || loading}>
            {collecting ? "Collecting..." : "Collect Analytics"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Published Posts" value={overview?.totalPosts ?? 0} loading={loading} />
        <MetricCard label="Impressions" value={overview?.totalImpressions ?? 0} loading={loading} />
        <MetricCard label="Reach" value={overview?.totalReach ?? 0} loading={loading} />
        <MetricCard label="Engagements" value={overview?.totalEngagements ?? 0} loading={loading} />
        <MetricCard
          label="Avg Engagement Rate"
          value={`${((overview?.avgEngagementRate ?? 0) * 100).toFixed(2)}%`}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analytics data yet. Collect analytics to populate charts.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="impressions" fill="var(--color-chart-1, #2563eb)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="engagements" fill="var(--color-chart-2, #10b981)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Posts by Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading posts...</p>
            ) : (overview?.topPosts.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No top posts yet.</p>
            ) : (
              <div className="space-y-2">
                {overview?.topPosts.map((post) => (
                  <button
                    key={post.draftId}
                    type="button"
                    onClick={() => setSelectedDraftId(post.draftId)}
                    className={`w-full rounded-md border p-2 text-left text-sm transition-colors hover:bg-muted/40 ${
                      selectedDraftId === post.draftId ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{post.variantLabel} · {PLATFORM_LABELS[post.platform]}</span>
                      <span className="text-xs text-muted-foreground">{(post.engagementRate * 100).toFixed(2)}%</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{post.pillar}</p>
                    <p className="truncate text-xs text-muted-foreground">{post.caption}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PerPostAnalyticsDetail draftId={selectedDraftId} />

      <VariantComparisonView comparisons={comparisons} loading={loading} />

      <TrendCharts trends={trends} loading={loading} periodDays={days} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{loading ? "..." : value}</p>
      </CardContent>
    </Card>
  );
}
