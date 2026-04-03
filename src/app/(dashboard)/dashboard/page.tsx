import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  FileText,
  TrendingUp,
  Sparkles,
  Zap,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  brandManifestos,
  platformConnections,
  contentStrategies,
  contentDrafts,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const stats = [
  {
    title: "Total Reach",
    value: "—",
    subtitle: "Connect platforms to see metrics",
    icon: TrendingUp,
    accent: "from-chart-1/20 to-chart-1/5",
    iconColor: "text-chart-1",
  },
  {
    title: "Engagement",
    value: "—",
    subtitle: "Across all platforms",
    icon: BarChart3,
    accent: "from-chart-2/20 to-chart-2/5",
    iconColor: "text-chart-2",
  },
  {
    title: "Scheduled Posts",
    value: "0",
    subtitle: "Upcoming this week",
    icon: Calendar,
    accent: "from-chart-3/20 to-chart-3/5",
    iconColor: "text-chart-3",
  },
  {
    title: "Drafts",
    value: "0",
    subtitle: "Pending approval",
    icon: FileText,
    accent: "from-chart-4/20 to-chart-4/5",
    iconColor: "text-chart-4",
  },
];

const STEPS = [
  {
    href: "/onboarding",
    step: 1,
    title: "Onboard your business",
    description: "Add your website, documents, and business info",
    icon: Sparkles,
  },
  {
    href: "/settings/platforms",
    step: 2,
    title: "Connect platforms",
    description: "Link Instagram, Facebook, LinkedIn, X, and GBP",
    icon: Zap,
  },
  {
    href: "/strategy",
    step: 3,
    title: "Generate your strategy",
    description: "AI creates content pillars, schedule, and calendar",
    icon: TrendingUp,
  },
  {
    href: "/content/drafts",
    step: 4,
    title: "Create and approve content",
    description: "AI writes platform-native posts for your review",
    icon: FileText,
  },
];

export default async function DashboardPage() {
  const { user } = await requireAuth();
  const tenantId = user.tenantId;

  const [manifesto, platform, strategy, draft] = await Promise.all([
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
  ]);

  const completed = [
    manifesto.length > 0,
    platform.length > 0,
    strategy.length > 0,
    draft.length > 0,
  ];

  // The active step is the first incomplete one; -1 means all done
  const activeIndex = completed.findIndex((done) => !done);
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI-powered social media command center.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-hoverable>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <div
                  className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.accent}`}
                >
                  <stat.icon className={`size-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Getting started — wider */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Getting Started
            </CardTitle>
            <CardDescription>
              Complete these steps to set up your social media manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {STEPS.map((step, i) => {
                const isDone = completed[i];
                const isActive = i === activeIndex;
                const isUpcoming = !isDone && !isActive;

                return (
                  <Link
                    key={step.step}
                    href={step.href}
                    className={`group flex items-center gap-4 rounded-xl border p-3.5 transition-all ${
                      isDone
                        ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : isActive
                        ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20 hover:bg-primary/10"
                        : "opacity-50 hover:opacity-70 hover:border-primary/20 hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isDone
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <step.icon className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            isDone ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {step.title}
                        </p>
                        {isActive && (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      className={`size-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                        isDone
                          ? "text-emerald-500/50"
                          : isActive
                          ? "text-primary/60 group-hover:text-primary"
                          : "text-muted-foreground/50 group-hover:text-primary"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest social media actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Sparkles className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start by onboarding your business to see activity here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
