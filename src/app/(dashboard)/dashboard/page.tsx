import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Calendar, FileText, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Conduit. Your AI-powered social media command center.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Connect platforms to see metrics
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduled Posts
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Upcoming this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Complete these steps to set up your social media manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/onboarding" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Onboard your business</p>
                  <p className="text-sm text-muted-foreground">
                    Add your website, documents, and business info
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link href="/settings/platforms" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Connect platforms</p>
                  <p className="text-sm text-muted-foreground">
                    Link Instagram, Facebook, LinkedIn, X, and GBP
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link href="/strategy" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Generate your strategy</p>
                  <p className="text-sm text-muted-foreground">
                    AI creates content pillars, schedule, and calendar
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link href="/content/drafts" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium">Create and approve content</p>
                  <p className="text-sm text-muted-foreground">
                    AI writes platform-native posts for your review
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest social media actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No activity yet. Start by onboarding your business.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
