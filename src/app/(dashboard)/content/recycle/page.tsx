"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Recycle, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { Platform } from "@/lib/types";

interface RecycleCandidate {
  draftId: string;
  platform: string;
  content: string;
  engagementScore: number;
  originalDate: string;
  suggestions: string[];
}

export default function RecyclePage() {
  const [candidates, setCandidates] = useState<RecycleCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/content/recycle");
      const data = await res.json();
      if (res.ok) setCandidates(data.candidates ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Recycle className="size-8 text-primary" />
          Content Recycling
        </h1>
        <p className="text-muted-foreground mt-1">
          Your top-performing content, ready to be repurposed. Recycle what works to maximize reach with less effort.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Recycle className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No recyclable content yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Publish some content first. Once posts have engagement data, top performers will appear here with recycling suggestions.
            </p>
            <Link
              href="/content/generate"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <Sparkles className="size-4" />
              Create content
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidates.map((c) => (
            <Card key={c.draftId}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {PLATFORM_LABELS[c.platform as Platform] ?? c.platform}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3.5" />
                      {c.engagementScore} engagements
                    </div>
                  </div>
                  {c.originalDate && (
                    <p className="text-xs text-muted-foreground">
                      Published {new Date(c.originalDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed line-clamp-3">
                  {c.content}
                </p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Recycling suggestions
                  </p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {c.suggestions.map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/content/generate?recycle=${c.draftId}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  <Recycle className="size-3.5" />
                  Recycle this post
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
