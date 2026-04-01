"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildCalendarPreview } from "@/lib/strategy/defaults";
import type { ContentStrategy } from "@/lib/types";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function CalendarView() {
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStrategy() {
      try {
        const response = await fetch("/api/strategy");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load strategy calendar");
        }

        setStrategy((data.strategy as ContentStrategy | null) ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load strategy calendar");
      } finally {
        setLoading(false);
      }
    }

    void loadStrategy();
  }, []);

  const items = useMemo(() => {
    return strategy ? buildCalendarPreview(strategy) : [];
  }, [strategy]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your content calendar...</div>;
  }

  if (!strategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No strategy yet</CardTitle>
          <CardDescription>
            Generate a strategy first so Conduit can populate your content calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/strategy" className={buttonVariants()}>
            Open strategy builder
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground">
          Preview the AI-generated weekly posting cadence based on your current strategy.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-7">
        {weekdays.map((day) => {
          const dayItems = items.filter((item) => item.day === day);
          return (
            <Card key={day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{day}</CardTitle>
                <CardDescription>
                  {dayItems.length} planned {dayItems.length === 1 ? "post" : "posts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayItems.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Free day for engagement or spontaneous content.
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium capitalize">{item.platform}</span>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="mt-2 font-medium">{item.theme}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.pillar}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Calendar notes
          </CardTitle>
          <CardDescription>
            This Phase 3 calendar is driven directly from your strategy schedule and weekly themes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Update the schedule on the Strategy page to change days, times, and cadence. A full drag-and-drop publishing calendar can be layered on top in the next iteration.
        </CardContent>
      </Card>
    </div>
  );
}
