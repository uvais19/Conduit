"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { Platform, PostAnalysis } from "@/lib/types";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Lightbulb,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { ExplainedScoreTooltip } from "@/components/explained-score-tooltip";

type AnalysisEntry = {
  platform: Platform;
  data: PostAnalysis;
  postsAnalysed: number;
  createdAt: string;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : score >= 40
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";

  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-lg font-bold ${color}`}>
      {score}/100
    </span>
  );
}

function PlatformAnalysisSection({ entry }: { entry: AnalysisEntry }) {
  const { data, postsAnalysed } = entry;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="flex flex-wrap items-start gap-6">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Alignment Score
          </p>
          <ExplainedScoreTooltip variant="analysis" side="bottom">
            <span className="inline-flex">
              <ScoreBadge score={data.overallScore} />
            </span>
          </ExplainedScoreTooltip>
        </div>
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">Posts analysed:</span>{" "}
            <span className="text-muted-foreground">{postsAnalysed}</span>
          </div>
          <div>
            <span className="font-medium">Avg engagement:</span>{" "}
            <span className="text-muted-foreground">
              {(data.engagementSummary.avgEngagementRate * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="font-medium">Total reach:</span>{" "}
            <span className="text-muted-foreground">
              {data.engagementSummary.totalReach.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="font-medium">Total impressions:</span>{" "}
            <span className="text-muted-foreground">
              {data.engagementSummary.totalImpressions.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{data.summary}</p>

      {/* Key Insights */}
      {data.keyInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* What's Working */}
      {data.topPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-emerald-500" />
              What&#39;s Working
            </CardTitle>
            <CardDescription>Top performing posts and why they resonate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topPosts.map((post, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {post.type}
                  </Badge>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {(post.engagementRate * 100).toFixed(2)}% engagement
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.impressions.toLocaleString()} impressions
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{post.content}</p>
                <p className="text-xs text-muted-foreground italic">
                  {post.explanation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* What's Not Working */}
      {data.underperformingPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-red-500" />
              What&#39;s Not Working
            </CardTitle>
            <CardDescription>Underperforming posts and areas to improve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.underperformingPosts.map((post, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {post.type}
                  </Badge>
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {(post.engagementRate * 100).toFixed(2)}% engagement
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.impressions.toLocaleString()} impressions
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{post.content}</p>
                <p className="text-xs text-muted-foreground italic">
                  {post.explanation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Content Mix */}
      {data.contentMix.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-chart-2" />
              Content Mix
            </CardTitle>
            <CardDescription>
              Detected tone: {data.detectedTone.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.contentMix.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium">{item.type}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-chart-2"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm text-muted-foreground">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Content Type */}
      {data.performanceByType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-chart-1" />
              Performance by Content Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Posts</th>
                    <th className="pb-2 font-medium">Avg Engagement</th>
                    <th className="pb-2 font-medium">Avg Reach</th>
                    <th className="pb-2 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {data.performanceByType.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{item.type}</td>
                      <td className="py-2">{item.postCount}</td>
                      <td className="py-2">
                        {(item.avgEngagementRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-2">{item.avgReach.toLocaleString()}</td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={
                            item.verdict === "high"
                              ? "border-emerald-500/30 text-emerald-600"
                              : item.verdict === "medium"
                              ? "border-amber-500/30 text-amber-600"
                              : "border-red-500/30 text-red-600"
                          }
                        >
                          {item.verdict}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Posting Times */}
      {data.bestPostingTimes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-chart-3" />
              Best Posting Times
            </CardTitle>
            <CardDescription>
              Posting frequency: ~{data.postingFrequency.postsPerWeek} posts/week,
              most active on {data.postingFrequency.mostActiveDay}s around{" "}
              {data.postingFrequency.mostActiveTime}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.bestPostingTimes.map((time, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-3 text-center"
                >
                  <p className="text-sm font-medium">{time.day}</p>
                  <p className="text-lg font-semibold">{time.timeRange}</p>
                  <p className="text-xs text-muted-foreground">
                    {(time.avgEngagementRate * 100).toFixed(2)}% avg engagement
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Topic */}
      {data.performanceByTopic.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Performing Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.performanceByTopic.map((topic, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <span className="text-xs text-muted-foreground">
                    {(topic.avgEngagementRate * 100).toFixed(2)}% avg engagement |{" "}
                    {topic.avgReach.toLocaleString()} avg reach
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 italic">
                  Example: &quot;{topic.examplePost}&quot;
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gap Analysis */}
      {(data.gapsVsManifesto.length > 0 || data.gapsVsStrategy.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gap Analysis</CardTitle>
            <CardDescription>
              Where your current posting diverges from your brand and strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.gapsVsManifesto.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Gaps vs Brand Manifesto
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Area</th>
                        <th className="pb-2 font-medium">Current</th>
                        <th className="pb-2 font-medium">Desired</th>
                        <th className="pb-2 font-medium">Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gapsVsManifesto.map((gap, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{gap.area}</td>
                          <td className="py-2 text-muted-foreground">
                            {gap.current}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {gap.desired}
                          </td>
                          <td className="py-2">{gap.suggestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {data.gapsVsStrategy.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Gaps vs Content Strategy
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Area</th>
                        <th className="pb-2 font-medium">Current</th>
                        <th className="pb-2 font-medium">Planned</th>
                        <th className="pb-2 font-medium">Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gapsVsStrategy.map((gap, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{gap.area}</td>
                          <td className="py-2 text-muted-foreground">
                            {gap.current}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {gap.desired}
                          </td>
                          <td className="py-2">{gap.suggestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="size-4 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Platform | null>(null);
  const [reanalysing, setReanalysing] = useState(false);

  async function fetchAnalyses() {
    setLoading(true);
    try {
      const res = await fetch("/api/platforms/analyse");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load analyses");
      const entries = (data.analyses ?? []) as AnalysisEntry[];
      setAnalyses(entries);
      if (entries.length > 0 && !activeTab) {
        setActiveTab(entries[0].platform);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReanalyse() {
    setReanalysing(true);
    setError("");
    try {
      const res = await fetch("/api/platforms/analyse", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Analysis failed");
      }
      await fetchAnalyses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setReanalysing(false);
    }
  }

  const activeAnalysis = analyses.find((a) => a.platform === activeTab);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Post Analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Post Analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered analysis of your existing social media posts
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <BarChart3 className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No analysis yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a platform and your posts will be automatically analysed.
            </p>
            <a
              href="/settings/platforms"
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Connect a Platform
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="animate-pulse-dot" />
              AI Analysis
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Post Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-powered insights drawn from your existing social media posts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={reanalysing}
            onClick={() => void handleReanalyse()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-background px-4 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`size-3.5 ${reanalysing ? "animate-spin" : ""}`}
            />
            {reanalysing ? "Analysing..." : "Re-analyse"}
          </button>
          <a
            href="/strategy"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md glow-primary transition-all hover:opacity-90"
          >
            <ArrowRight className="size-3.5" />
            Regenerate Strategy
          </a>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Platform tabs */}
      <div className="flex gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
        {analyses.map((a) => (
          <button
            key={a.platform}
            type="button"
            onClick={() => setActiveTab(a.platform)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === a.platform
                ? "bg-background shadow-sm text-foreground ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {PLATFORM_LABELS[a.platform]}
          </button>
        ))}
      </div>

      {/* Active platform analysis */}
      {activeAnalysis && <PlatformAnalysisSection entry={activeAnalysis} />}
    </div>
  );
}
