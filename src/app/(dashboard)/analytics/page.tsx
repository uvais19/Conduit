"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/constants";
import type {
  DashboardOverview,
  TrendPoint,
  VariantComparison,
  AnalyticsAttributionSummary,
  BestPostingWindow,
  EngagementAnomaly,
  FollowerGrowthPoint,
  ForecastPoint,
  HashtagPerformance,
  SentimentSummary,
} from "@/lib/analytics/types";
import { VariantComparisonView } from "@/components/variant-comparison-view";
import { TrendCharts } from "@/components/trend-charts";
import { PerPostAnalyticsDetail } from "@/components/per-post-analytics-detail";
import { MetricsDataSourceBadge } from "@/components/metrics-data-source-badge";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ExportDraftsButton } from "@/components/export-drafts-button";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [runningScheduled, setRunningScheduled] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [audience, setAudience] = useState<{ demographics: string; psychographics: string } | null>(null);
  const [followerGrowth, setFollowerGrowth] = useState<FollowerGrowthPoint[]>([]);
  const [hashtags, setHashtags] = useState<HashtagPerformance[]>([]);
  const [bestWindows, setBestWindows] = useState<BestPostingWindow[]>([]);
  const [anomalies, setAnomalies] = useState<EngagementAnomaly[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSummary | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [attribution, setAttribution] = useState<AnalyticsAttributionSummary | null>(null);
  const [utmDestination, setUtmDestination] = useState("");
  const [utmSource, setUtmSource] = useState("newsletter");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [generatedUtm, setGeneratedUtm] = useState("");
  const [conversionDraftId, setConversionDraftId] = useState("");
  const [conversionVisits, setConversionVisits] = useState(0);
  const [conversionCount, setConversionCount] = useState(0);
  const [conversionRevenue, setConversionRevenue] = useState(0);
  const [prediction, setPrediction] = useState<{
    predictedEngagementRate: number;
    confidence: string;
  } | null>(null);
  const [predictionCaption, setPredictionCaption] = useState("");
  const [predictionHashtags, setPredictionHashtags] = useState("");
  const [predictionPlatform, setPredictionPlatform] = useState("instagram");
  const [gaPropertyId, setGaPropertyId] = useState("");
  const [gaVisits, setGaVisits] = useState(0);
  const [gaConversions, setGaConversions] = useState(0);
  const [gaRevenue, setGaRevenue] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (selectedPlatforms.length > 0) params.set("platforms", selectedPlatforms.join(","));
    return params.toString();
  }, [dateFrom, dateTo, selectedPlatforms]);

  async function fetchOverview() {
    const response = await fetch(`/api/analytics${queryString ? `?${queryString}` : ""}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load analytics overview");
    setOverview(data.overview as DashboardOverview);
  }

  async function fetchComparisons() {
    const response = await fetch(`/api/analytics/variants${queryString ? `?${queryString}` : ""}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load variant comparisons");
    setComparisons((data.comparisons as VariantComparison[]) ?? []);
  }

  async function fetchTrends(nextDays: 7 | 30) {
    const params = new URLSearchParams(queryString);
    params.set("days", String(nextDays));
    const response = await fetch(`/api/analytics/trends?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load trend data");
    setTrends((data.trends as TrendPoint[]) ?? []);
  }

  async function fetchInsights() {
    setInsightsLoading(true);
    try {
      const response = await fetch(`/api/analytics/insights${queryString ? `?${queryString}` : ""}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load analytics insights");
      setAudience(data.audience ?? null);
      setFollowerGrowth((data.followerGrowth as FollowerGrowthPoint[]) ?? []);
      setHashtags((data.hashtags as HashtagPerformance[]) ?? []);
      setBestWindows((data.bestWindows as BestPostingWindow[]) ?? []);
      setAnomalies((data.anomalies as EngagementAnomaly[]) ?? []);
      setSentiment((data.sentiment as SentimentSummary) ?? null);
      setForecast((data.forecast as ForecastPoint[]) ?? []);
      setAttribution((data.attribution as AnalyticsAttributionSummary) ?? null);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function refreshAll(nextDays: 7 | 30 = days) {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchOverview(), fetchComparisons(), fetchTrends(nextDays), fetchInsights()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, queryString]);

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

  async function runScheduledCollection() {
    setRunningScheduled(true);
    try {
      const response = await fetch("/api/analytics/collect/scheduled/manual", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to run scheduled collection");
      toast.success(data.message ?? "Scheduled analytics pipeline run complete");
      await refreshAll(days);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to run scheduled collection");
    } finally {
      setRunningScheduled(false);
    }
  }

  async function buildUtm() {
    try {
      const response = await fetch("/api/analytics/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: utmDestination,
          source: utmSource,
          medium: utmMedium,
          campaign: utmCampaign,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to build UTM URL");
      setGeneratedUtm(data.utmUrl ?? "");
      toast.success("UTM link generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to build UTM URL");
    }
  }

  async function recordConversion() {
    try {
      const response = await fetch("/api/analytics/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: conversionDraftId,
          visits: conversionVisits,
          conversions: conversionCount,
          revenue: conversionRevenue,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to record conversion");
      setAttribution((data.summary as AnalyticsAttributionSummary) ?? null);
      toast.success("Conversion event recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to record conversion");
    }
  }

  async function predictEngagement() {
    try {
      const response = await fetch("/api/analytics/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: predictionPlatform,
          caption: predictionCaption,
          hashtags: predictionHashtags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to predict engagement");
      setPrediction(data.prediction ?? null);
      toast.success("Engagement prediction generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to predict engagement");
    }
  }

  async function scanAnomalies() {
    try {
      const response = await fetch("/api/analytics/anomalies/scan", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to scan anomalies");
      setAnomalies((data.anomalies as EngagementAnomaly[]) ?? anomalies);
      toast.success(data.alerted ? "Anomaly alert sent" : "Anomaly scan complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to scan anomalies");
    }
  }

  async function linkGaProperty() {
    try {
      const response = await fetch("/api/analytics/ga/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: gaPropertyId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to link GA property");
      toast.success(`Linked GA property ${data.link?.propertyId ?? gaPropertyId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to link GA property");
    }
  }

  async function importGaSummary() {
    try {
      const response = await fetch("/api/analytics/ga/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visits: gaVisits,
          conversions: gaConversions,
          revenue: gaRevenue,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to import GA summary");
      toast.success("GA summary imported");
      await refreshAll(days);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to import GA summary");
    }
  }

  const handleExport = useCallback(async (format: "csv" | "json" | "pdf") => {
    setExporting(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("format", format);
      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [queryString]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            {overview ? (
              <MetricsDataSourceBadge
                live={overview.metricsSourceBreakdown.live}
                simulated={overview.metricsSourceBreakdown.simulated}
              />
            ) : null}
          </div>
          <p className="text-muted-foreground">
            Performance overview, top-performing posts, and variant insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            variant="outline"
            onClick={() => void runScheduledCollection()}
            disabled={runningScheduled || loading}
          >
            {runningScheduled ? "Running pipeline..." : "Run Scheduled Pipeline"}
          </Button>
        </div>
      </div>

      {/* Date range + export controls */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExport("csv")}
          >
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExport("json")}
          >
            <Download className="mr-1.5 size-3.5" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExport("pdf")}
          >
            <Download className="mr-1.5 size-3.5" />
            Export PDF
          </Button>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Platforms</label>
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={selectedPlatforms[0] ?? ""}
              onChange={(e) =>
                setSelectedPlatforms(e.target.value ? [e.target.value] : [])
              }
            >
              <option value="">All platforms</option>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 border-l pl-3 sm:pl-4">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              All drafts
            </span>
            <ExportDraftsButton />
          </div>
        </CardContent>
      </Card>

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
            <CardTitle className="flex flex-wrap items-center gap-2">
              Platform Breakdown
              {overview ? (
                <MetricsDataSourceBadge
                  live={overview.metricsSourceBreakdown.live}
                  simulated={overview.metricsSourceBreakdown.simulated}
                />
              ) : null}
            </CardTitle>
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
            <CardTitle className="flex flex-wrap items-center gap-2">
              Top Posts by Engagement
              {overview ? (
                <MetricsDataSourceBadge
                  live={overview.metricsSourceBreakdown.live}
                  simulated={overview.metricsSourceBreakdown.simulated}
                />
              ) : null}
            </CardTitle>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pre-Publish Engagement Prediction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              value={predictionPlatform}
              onChange={(e) => setPredictionPlatform(e.target.value)}
            >
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              className="min-h-[90px] w-full rounded-md border bg-transparent p-3 text-sm"
              placeholder="Draft caption"
              value={predictionCaption}
              onChange={(e) => setPredictionCaption(e.target.value)}
            />
            <input
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              placeholder="hashtags,comma,separated"
              value={predictionHashtags}
              onChange={(e) => setPredictionHashtags(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => void predictEngagement()} disabled={!predictionCaption.trim()}>
                Predict Engagement
              </Button>
              <Button variant="outline" onClick={() => void scanAnomalies()}>
                Scan Anomalies
              </Button>
            </div>
            {prediction ? (
              <p className="text-sm text-muted-foreground">
                Predicted ER {(prediction.predictedEngagementRate * 100).toFixed(2)}% ({prediction.confidence} confidence)
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Analytics Link and Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              placeholder="GA Property ID"
              value={gaPropertyId}
              onChange={(e) => setGaPropertyId(e.target.value)}
            />
            <Button onClick={() => void linkGaProperty()} disabled={!gaPropertyId.trim()}>
              Link GA Property
            </Button>
            <div className="grid gap-2 sm:grid-cols-3">
              <input type="number" className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="GA visits" value={gaVisits} onChange={(e) => setGaVisits(Number(e.target.value))} />
              <input type="number" className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="GA conversions" value={gaConversions} onChange={(e) => setGaConversions(Number(e.target.value))} />
              <input type="number" className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="GA revenue" value={gaRevenue} onChange={(e) => setGaRevenue(Number(e.target.value))} />
            </div>
            <Button variant="outline" onClick={() => void importGaSummary()}>
              Import GA Summary
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Follower Growth (Insights)</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <p className="text-sm text-muted-foreground">Loading follower growth...</p>
            ) : followerGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follower growth points yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={followerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="followers" stroke="var(--color-chart-1, #2563eb)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Forecast and Anomaly Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {forecast.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="predictedEngagementRate" stroke="var(--color-chart-2, #10b981)" strokeWidth={2} />
                    <Line type="monotone" dataKey="lowerBound" stroke="var(--color-chart-3, #f59e0b)" strokeWidth={1} />
                    <Line type="monotone" dataKey="upperBound" stroke="var(--color-chart-4, #8b5cf6)" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No forecast data yet.</p>
            )}
            <div className="space-y-1">
              {anomalies.slice(0, 4).map((anomaly) => (
                <div key={anomaly.date} className="rounded-md border px-2 py-1 text-xs">
                  {anomaly.date}: {anomaly.deltaPercent}% ({anomaly.severity})
                </div>
              ))}
              {anomalies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No anomalies detected.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hashtag Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {hashtags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hashtag analytics yet.</p>
            ) : (
              <div className="space-y-2">
                {hashtags.slice(0, 8).map((tag) => (
                  <div key={tag.hashtag} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                    <span>#{tag.hashtag.replace(/^#/, "")}</span>
                    <span className="text-muted-foreground">
                      {(tag.avgEngagementRate * 100).toFixed(2)}% ER · {tag.uses} uses · {tag.source ?? "unknown"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best Posting Windows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bestWindows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posting windows learned yet.</p>
            ) : (
              bestWindows.slice(0, 8).map((window) => (
                <div key={`${window.weekday}-${window.hour}`} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                  <span>
                    {window.weekday} {window.hour.toString().padStart(2, "0")}:00
                  </span>
                  <span className="text-muted-foreground">
                    {(window.avgEngagementRate * 100).toFixed(2)}% ER · n={window.sampleSize}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <PerPostAnalyticsDetail draftId={selectedDraftId} />

      <VariantComparisonView comparisons={comparisons} loading={loading} />

      <TrendCharts
        trends={trends}
        loading={loading}
        periodDays={days}
        metricsSourceBreakdown={overview?.metricsSourceBreakdown}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Audience and Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {insightsLoading ? <p className="text-muted-foreground">Loading insights...</p> : null}
            <p><span className="font-medium">Demographics:</span> {audience?.demographics ?? "N/A"}</p>
            <p><span className="font-medium">Psychographics:</span> {audience?.psychographics ?? "N/A"}</p>
            <p><span className="font-medium">Tracked posts:</span> {attribution?.trackedPosts ?? 0}</p>
            <p><span className="font-medium">Visits:</span> {attribution?.visits ?? 0}</p>
            <p><span className="font-medium">Conversions:</span> {attribution?.conversions ?? 0}</p>
            <p><span className="font-medium">Revenue:</span> ${attribution?.revenue ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Predictive and Quality Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Sentiment score:</span> {sentiment ? sentiment.score : 0}</p>
            <p><span className="font-medium">Anomalies:</span> {anomalies.length}</p>
            <p><span className="font-medium">Forecast points:</span> {forecast.length}</p>
            <p><span className="font-medium">Follower growth points:</span> {followerGrowth.length}</p>
            <p><span className="font-medium">Top hashtags tracked:</span> {hashtags.length}</p>
            <p><span className="font-medium">Best posting windows:</span> {bestWindows.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>UTM Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              placeholder="Destination URL"
              value={utmDestination}
              onChange={(e) => setUtmDestination(e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="Source" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
              <input className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="Medium" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
              <input className="h-9 rounded-md border bg-transparent px-3 text-sm" placeholder="Campaign" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
            </div>
            <Button onClick={() => void buildUtm()} disabled={!utmDestination || !utmCampaign}>
              Generate UTM URL
            </Button>
            {generatedUtm ? (
              <p className="rounded-md border p-2 text-xs text-muted-foreground break-all">{generatedUtm}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Capture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              placeholder="Draft ID"
              value={conversionDraftId}
              onChange={(e) => setConversionDraftId(e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="number"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                placeholder="Visits"
                value={conversionVisits}
                onChange={(e) => setConversionVisits(Number(e.target.value))}
              />
              <input
                type="number"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                placeholder="Conversions"
                value={conversionCount}
                onChange={(e) => setConversionCount(Number(e.target.value))}
              />
              <input
                type="number"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                placeholder="Revenue"
                value={conversionRevenue}
                onChange={(e) => setConversionRevenue(Number(e.target.value))}
              />
            </div>
            <Button onClick={() => void recordConversion()} disabled={!conversionDraftId}>
              Record Conversion Event
            </Button>
          </CardContent>
        </Card>
      </div>
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
