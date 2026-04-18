import {
  BarChart3,
  Calendar,
  FileText,
  TrendingUp,
  Sparkles,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  Send,
} from "lucide-react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  brandManifestos,
  platformConnections,
  contentStrategies,
  contentDrafts,
  platformAnalyses,
  postAnalytics,
} from "@/lib/db/schema";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import type { PostAnalysis, Platform } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/constants";
import { getRecentActivity } from "@/lib/audit-log";
import { ExplainedScoreTooltip } from "@/components/explained-score-tooltip";

/** Per-tenant checklist must reflect latest manifesto, strategy, drafts, and connections. */
export const dynamic = "force-dynamic";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const ACTIVITY_ICONS: Record<string, typeof Edit> = {
  "draft.created": Edit,
  "draft.submitted": Send,
  "draft.approved": CheckCircle2,
  "draft.published": Eye,
  "draft.scheduled": Clock,
  "strategy.created": TrendingUp,
  "strategy.updated": TrendingUp,
  "brand.manifesto_created": Sparkles,
};

const STEPS = [
  {
    href: "/onboarding",
    step: 1,
    title: "Onboard your business",
    description: "Add your website, documents, and business info",
    icon: Sparkles,
  },
  {
    href: "/strategy",
    step: 2,
    title: "Generate your strategy",
    description: "AI creates content pillars, schedule, and calendar",
    icon: TrendingUp,
  },
  {
    href: "/content/drafts",
    step: 3,
    title: "Create and approve content",
    description: "AI writes platform-native posts for your review",
    icon: FileText,
  },
  {
    href: "/settings/platforms",
    step: 4,
    title: "Connect platforms",
    description: "Link Instagram, Facebook, and LinkedIn",
    icon: Zap,
  },
];

export default async function DashboardPage() {
  const { user } = await requireAuth();
  const tenantId = user.tenantId;

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [manifesto, platform, strategy, draft, analyses, analyticsAgg, scheduledCount, pendingCount, recentActivity] = await Promise.all([
    db
      .select({ id: brandManifestos.id })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .limit(1),
    db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(eq(platformConnections.tenantId, tenantId))
      .limit(1),
    db
      .select({ id: contentStrategies.id })
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .limit(1),
    db
      .select({ id: contentDrafts.id })
      .from(contentDrafts)
      .where(eq(contentDrafts.tenantId, tenantId))
      .limit(1),
    db
      .select({
        platform: platformAnalyses.platform,
        data: platformAnalyses.data,
        postsAnalysed: platformAnalyses.postsAnalysed,
      })
      .from(platformAnalyses)
      .where(eq(platformAnalyses.tenantId, tenantId)),
    // Aggregate analytics
    db
      .select({
        totalReach: sql<number>`COALESCE(SUM(${postAnalytics.reach}), 0)`,
        totalEngagements: sql<number>`COALESCE(SUM(${postAnalytics.likes} + ${postAnalytics.comments} + ${postAnalytics.shares} + ${postAnalytics.saves} + ${postAnalytics.clicks}), 0)`,
      })
      .from(postAnalytics)
      .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
      .where(eq(contentDrafts.tenantId, tenantId)),
    // Scheduled posts this week  
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(contentDrafts)
      .where(
        and(
          eq(contentDrafts.tenantId, tenantId),
          eq(contentDrafts.status, "scheduled"),
          gte(contentDrafts.scheduledAt, now),
        ),
      ),
    // Pending drafts (in-review)
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(contentDrafts)
      .where(
        and(
          eq(contentDrafts.tenantId, tenantId),
          inArray(contentDrafts.status, ["draft", "in-review"]),
        ),
      ),
    // Activity feed
    getRecentActivity(tenantId, { limit: 8 }),
  ]);

  const totalReach = Number(analyticsAgg[0]?.totalReach ?? 0);
  const totalEngagements = Number(analyticsAgg[0]?.totalEngagements ?? 0);
  const scheduled = Number(scheduledCount[0]?.count ?? 0);
  const pending = Number(pendingCount[0]?.count ?? 0);

  const liveStats = [
    {
      title: "Total Reach",
      value: totalReach > 0 ? formatNumber(totalReach) : "—",
      subtitle: totalReach > 0 ? "Across all platforms" : "Connect platforms to see metrics",
      icon: TrendingUp,
      gradient: "from-chart-1/10 to-chart-1/5",
      iconBg: "bg-chart-1/12 text-chart-1",
    },
    {
      title: "Engagement",
      value: totalEngagements > 0 ? formatNumber(totalEngagements) : "—",
      subtitle: totalEngagements > 0 ? "Likes, comments, shares, saves, clicks" : "Across all platforms",
      icon: BarChart3,
      gradient: "from-chart-2/10 to-chart-2/5",
      iconBg: "bg-chart-2/12 text-chart-2",
    },
    {
      title: "Scheduled Posts",
      value: String(scheduled),
      subtitle: "Upcoming this week",
      icon: Calendar,
      gradient: "from-chart-3/10 to-chart-3/5",
      iconBg: "bg-chart-3/12 text-chart-3",
    },
    {
      title: "Drafts",
      value: String(pending),
      subtitle: "Pending review",
      icon: FileText,
      gradient: "from-chart-4/10 to-chart-4/5",
      iconBg: "bg-chart-4/12 text-chart-4",
    },
  ];

  const completed = [
    manifesto.length > 0,
    strategy.length > 0,
    draft.length > 0,
    platform.length > 0,
  ];

  const activeIndex = completed.findIndex((done) => !done);

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
          Workspace
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Signals across reach, engagement, scheduling, and drafts — structured as a checklist, not a card stack.
        </p>
      </header>

      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveStats.map((stat) => (
            <article
              key={stat.title}
              className="relative flex min-h-[7.5rem] flex-col overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-sm"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.gradient}`} aria-hidden />
              <div className="relative flex items-start justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </span>
                <span className={`flex size-8 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className="size-4 shrink-0" aria-hidden />
                </span>
              </div>
              <p className="relative mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
              <p className="relative mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm lg:col-span-3">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
              Setup checklist
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete each stage in order — the active step is marked.
            </p>
          </div>
          <ol className="divide-y divide-border/60">
            {STEPS.map((step, i) => {
              const isDone = completed[i];
              const isActive = i === activeIndex;

              return (
                <li key={step.step}>
                  <Link
                    href={step.href}
                    className={`group flex gap-4 px-5 py-4 transition-colors ${
                      isDone
                        ? "bg-muted/40 hover:bg-muted/60"
                        : isActive
                          ? "bg-primary/5 hover:bg-primary/8"
                          : "opacity-60 hover:opacity-90"
                    }`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400"
                          : isActive
                            ? "bg-primary text-primary-foreground shadow-md glow-primary"
                            : "bg-muted text-muted-foreground ring-1 ring-border"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="size-5" /> : step.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isDone ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {step.title}
                        </span>
                        {isActive && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            Now
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
              Activity
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest actions across your workspace.
            </p>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <p className="mt-4 text-sm font-semibold">No activity yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Finish onboarding to populate this feed with drafts, approvals, and publishes.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.action] ?? Sparkles;
                const timeAgo = getTimeAgo(new Date(item.createdAt));
                return (
                  <li key={item.id} className="flex gap-3 px-5 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{item.action.replace(".", " → ").replace(/_/g, " ")}</span>
                      </p>
                      {item.resourceType && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.resourceType}{item.resourceId ? ` · ${item.resourceId.slice(0, 8)}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{timeAgo}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {analyses.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chart-1/12 text-chart-1">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
                  Posting baseline
                </h2>
                <p className="text-sm text-muted-foreground">
                  AI analysis of your existing posts vs. your brand strategy
                </p>
              </div>
            </div>
            <Link
              href="/analysis"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border/80 bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              Full analysis
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="space-y-8 px-5 py-6">
            {analyses.map((a) => {
              const data = a.data as PostAnalysis;
              return (
                <div key={a.platform} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold">
                      {PLATFORM_LABELS[a.platform as Platform]}
                    </span>
                    <ExplainedScoreTooltip variant="analysis" side="bottom">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                          data.overallScore >= 70
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : data.overallScore >= 40
                              ? "bg-amber-500/10 text-amber-800 dark:text-amber-400"
                              : "bg-red-500/10 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {data.overallScore}/100
                      </span>
                    </ExplainedScoreTooltip>
                    <span className="text-xs text-muted-foreground">
                      {a.postsAnalysed} posts analysed
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{data.summary}</p>
                  {data.keyInsights.length > 0 && (
                    <ul className="space-y-2 border-l-2 border-primary/20 pl-4">
                      {data.keyInsights.slice(0, 3).map((insight, idx) => (
                        <li key={idx} className="text-sm">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.gapsVsManifesto.length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Gaps to address
                      </p>
                      <div className="space-y-2">
                        {data.gapsVsManifesto.slice(0, 2).map((gap, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-semibold">{gap.area}:</span>{" "}
                            <span className="text-muted-foreground">
                              {gap.suggestion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
