"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { PostMetrics } from "@/lib/analytics/types";

type DraftAnalyticsResponse = {
  draft: ContentDraftRecord;
  metrics: PostMetrics[];
};

export function PerPostAnalyticsDetail({ draftId }: { draftId: string | null }) {
  const [draft, setDraft] = useState<ContentDraftRecord | null>(null);
  const [metrics, setMetrics] = useState<PostMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draftId) {
      setDraft(null);
      setMetrics([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/analytics/${draftId}`);
        const data = (await response.json()) as DraftAnalyticsResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load post analytics");
        if (cancelled) return;
        setDraft(data.draft);
        setMetrics(data.metrics ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load post analytics");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const timeline = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))
        .map((point) => ({
          collectedAt: new Date(point.collectedAt).toLocaleDateString(),
          impressions: point.impressions,
          reach: point.reach,
          engagementRate: Math.round(point.engagementRate * 10000) / 100,
        })),
    [metrics]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Post Performance Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draftId ? (
          <p className="text-sm text-muted-foreground">Select a post from the top-post list to inspect detailed metrics.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading post analytics...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !draft ? (
          <p className="text-sm text-muted-foreground">No draft selected.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Platform" value={PLATFORM_LABELS[draft.platform]} />
              <Stat label="Pillar" value={draft.pillar} />
              <Stat label="Variant" value={draft.variantLabel} />
              <Stat
                label="Latest Engagement"
                value={metrics[0] ? `${(metrics[0].engagementRate * 100).toFixed(2)}%` : "N/A"}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Caption</p>
              <p className="text-sm text-muted-foreground">{draft.caption}</p>
            </div>

            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analytics snapshots found for this post yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="collectedAt" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="impressions" stroke="var(--color-chart-1, #2563eb)" strokeWidth={2} />
                    <Line type="monotone" dataKey="reach" stroke="var(--color-chart-2, #10b981)" strokeWidth={2} />
                    <Line type="monotone" dataKey="engagementRate" stroke="var(--color-chart-3, #f59e0b)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
