"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Edit,
  CheckCircle2,
  Eye,
  Clock,
  Send,
  Trash2,
  FileText,
  TrendingUp,
  Sparkles,
  Users,
  Settings,
} from "lucide-react";

type ActivityItem = {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const ACTION_ICONS: Record<string, typeof Edit> = {
  "draft.created": Edit,
  "draft.edited": Edit,
  "draft.submitted": Send,
  "draft.approved": CheckCircle2,
  "draft.published": Eye,
  "draft.scheduled": Clock,
  "draft.deleted": Trash2,
  "draft.revision_requested": FileText,
  "strategy.created": TrendingUp,
  "strategy.updated": TrendingUp,
  "brand.manifesto_created": Sparkles,
  "brand.manifesto_updated": Sparkles,
  "team.member_invited": Users,
  "team.member_removed": Users,
  "team.role_changed": Users,
  "settings.updated": Settings,
};

const ACTION_COLORS: Record<string, string> = {
  "draft.approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "draft.published": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "draft.deleted": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "draft.revision_requested": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  const loadActivities = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", offset: String(pageNum * 30) });
      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        const items = (data.activities ?? []) as ActivityItem[];
        setActivities((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length >= 30);
      }
    } catch {
      // Silently fail — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities(0);
  }, [loadActivities]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    void loadActivities(next, true);
  }

  const filtered = filterAction
    ? activities.filter((a) => a.action.includes(filterAction))
    : activities;

  const uniqueActions = Array.from(new Set(activities.map((a) => a.action)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Audit trail of all actions across your workspace.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !filterAction ? "bg-primary text-primary-foreground" : "border hover:bg-muted"
          }`}
          onClick={() => setFilterAction("")}
        >
          All
        </button>
        {uniqueActions.map((action) => (
          <button
            key={action}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterAction === action ? "bg-primary text-primary-foreground" : "border hover:bg-muted"
            }`}
            onClick={() => setFilterAction(action)}
          >
            {action.replace(".", " → ").replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Recent Activity
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({filtered.length} items)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading activity log...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Activity className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No activity recorded yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Actions like creating drafts, approving content, and publishing posts
                will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const Icon = ACTION_ICONS[item.action] ?? Activity;
                const colorClass = ACTION_COLORS[item.action] ?? "bg-muted text-muted-foreground";
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {item.action.replace(".", " → ").replace(/_/g, " ")}
                        </Badge>
                        {item.resourceType && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.resourceType}
                          </span>
                        )}
                      </div>
                      {item.resourceId && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          ID: {item.resourceId.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && !loading && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
