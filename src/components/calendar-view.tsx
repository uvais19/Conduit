"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Download,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildCalendarPreview,
  type CalendarPreviewItem,
} from "@/lib/strategy/defaults";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { CalendarMonthPlan, ContentStrategy } from "@/lib/types";
import type { ContentDraftRecord } from "@/lib/content/types";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

// ── types ────────────────────────────────────────────────────
type CalendarMode = "week" | "month" | "quarter";
type DaySlot = { date: Date; label: string; isToday: boolean; isCurrentMonth: boolean };

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  facebook: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  linkedin: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
};

// ── helpers ──────────────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number): DaySlot[] {
  const today = new Date();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  // Start grid from Monday before first
  const startDay = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -(startDay === 0 ? 6 : startDay - 1));
  const slots: DaySlot[] = [];
  const end = addDays(lastOfMonth, 7 - (lastOfMonth.getDay() === 0 ? 7 : lastOfMonth.getDay()));
  let cur = new Date(gridStart);
  while (cur <= end) {
    slots.push({
      date: new Date(cur),
      label: cur.getDate().toString(),
      isToday: isSameDay(cur, today),
      isCurrentMonth: cur.getMonth() === month,
    });
    cur = addDays(cur, 1);
  }
  return slots;
}

function startOfQuarter(d: Date): Date {
  const month = d.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(d.getFullYear(), quarterStartMonth, 1);
}

function getQuarterMonths(d: Date): Date[] {
  const start = startOfQuarter(d);
  return [0, 1, 2].map((offset) => new Date(start.getFullYear(), start.getMonth() + offset, 1));
}

// ── sortable calendar item ──────────────────────────────────
function SortableCalendarItem({
  item,
  compact,
}: {
  item: CalendarPreviewItem;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border p-2 text-sm ${PLATFORM_COLORS[item.platform] ?? "bg-muted"} ${
        compact ? "p-1.5 text-xs" : "p-2"
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Drag to reschedule"
        >
          <GripVertical className="size-3" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium capitalize truncate">
              {compact ? item.platform.slice(0, 3) : PLATFORM_LABELS[item.platform] ?? item.platform}
            </span>
            <span className="text-[10px] opacity-70">{item.time}</span>
          </div>
          {!compact && (
            <>
              <p className="mt-1 font-medium truncate">{item.theme}</p>
              <p className="mt-0.5 text-xs opacity-70 truncate">{item.pillar}</p>
              {item.idea ? (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                  {item.idea}
                </p>
              ) : null}
              {item.keyMessage && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.keyMessage}</p>
              )}
              {item.executionNotes && (
                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground/90">
                  {item.executionNotes}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── scheduled draft item (actual DB drafts) ─────────────────
function ScheduledDraftItem({ draft }: { draft: ContentDraftRecord }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium capitalize">
          {PLATFORM_LABELS[draft.platform]}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {draft.status}
        </Badge>
      </div>
      <p className="mt-1 truncate text-xs">{draft.caption?.slice(0, 60)}</p>
      {draft.scheduledAt && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {new Date(draft.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

// ── heatmap ─────────────────────────────────────────────────
function PostingHeatmap({ items }: { items: CalendarPreviewItem[] }) {
  const heatmap = useMemo(() => {
    const grid: Record<string, number> = {};
    for (const item of items) {
      grid[item.day] = (grid[item.day] ?? 0) + 1;
    }
    return WEEKDAYS.map((day) => ({ day, count: grid[day] ?? 0 }));
  }, [items]);

  const maxCount = Math.max(...heatmap.map((h) => h.count), 1);

  return (
    <div className="flex items-end gap-1">
      {heatmap.map((h) => (
        <div key={h.day} className="flex flex-col items-center gap-1">
          <div
            className="w-8 rounded-sm transition-all"
            style={{
              height: `${Math.max(8, (h.count / maxCount) * 48)}px`,
              backgroundColor: h.count === 0
                ? "var(--color-muted)"
                : `oklch(from var(--color-primary) l c h / ${0.2 + 0.8 * (h.count / maxCount)})`,
            }}
          />
          <span className="text-[10px] text-muted-foreground">{h.day.slice(0, 3)}</span>
          <span className="text-[10px] font-medium">{h.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── conflict detector ───────────────────────────────────────
function ConflictBanner({ items }: { items: CalendarPreviewItem[] }) {
  const conflicts = useMemo(() => {
    const seen = new Map<string, CalendarPreviewItem[]>();
    for (const item of items) {
      const dayKey = item.date ?? item.day;
      const key = `${dayKey}-${item.time}-${item.platform}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(item);
    }
    return Array.from(seen.entries())
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({
        key,
        day: group[0].day,
        time: group[0].time,
        platform: group[0].platform,
        count: group.length,
      }));
  }, [items]);

  if (conflicts.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300">
          {conflicts.length} scheduling {conflicts.length === 1 ? "conflict" : "conflicts"} detected
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
          {conflicts.slice(0, 3).map((c) => (
            <li key={c.key}>
              {c.count} posts on {PLATFORM_LABELS[c.platform] ?? c.platform} at {c.time} on {c.day}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────────────────
export function CalendarView() {
  const searchParams = useSearchParams();
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [scheduledDrafts, setScheduledDrafts] = useState<ContentDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<CalendarMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarPreviewItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    async function load() {
      try {
        const [stratRes, draftsRes] = await Promise.all([
          fetch("/api/strategy"),
          fetch("/api/drafts?status=scheduled"),
        ]);
        const stratData = await stratRes.json();
        const draftsData = await draftsRes.json();

        if (!stratRes.ok) throw new Error(stratData.error || "Unable to load strategy calendar");

        const strat = (stratData.strategy as ContentStrategy | null) ?? null;
        setStrategy(strat);
        if (strat) {
          const generatedRes = await fetch("/api/calendar/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (generatedRes.ok) {
            const generatedData = await generatedRes.json();
            const plan = generatedData.plan as CalendarMonthPlan | null;
            if (plan?.items?.length) {
              const strategyByPlatform = new Map(
                strat.schedule.map((entry) => [entry.platform, entry])
              );
              const counters = new Map<string, number>();
              setCalendarItems(
                plan.items.map((item) => {
                  const dt = new Date(`${item.date}T00:00:00`);
                  const day = dt.toLocaleDateString("en-US", { weekday: "long" });
                  const schedule = strategyByPlatform.get(item.platform);
                  const idx = counters.get(item.platform) ?? 0;
                  counters.set(item.platform, idx + 1);
                  const time =
                    schedule?.preferredTimes[idx % Math.max(1, schedule.preferredTimes.length)] ??
                    "09:00";
                  return {
                    id: item.id,
                    date: item.date,
                    day,
                    time,
                    platform: item.platform,
                    pillar: item.pillar,
                    idea: item.idea,
                    theme: item.idea,
                    keyMessage: item.keyMessage ?? "",
                    executionNotes: item.notes,
                    contentType: item.contentType ?? "text-only",
                    summary: `${item.idea} • ${item.contentType ?? "text-only"}`,
                  } satisfies CalendarPreviewItem;
                })
              );
            } else {
              setCalendarItems(buildCalendarPreview(strat));
            }
          } else {
            setCalendarItems(buildCalendarPreview(strat));
          }
        }
        if (draftsRes.ok && draftsData.drafts) {
          setScheduledDrafts(draftsData.drafts as ContentDraftRecord[]);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load strategy calendar");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // If dropped on a different day column, reschedule
      const overDate = String(over.id);
      if (/^\d{4}-\d{2}-\d{2}$/.test(overDate)) {
        const overDay = new Date(`${overDate}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
        });
        setCalendarItems((prev) =>
          prev.map((item) =>
            item.id === String(active.id)
              ? { ...item, date: overDate, day: overDay }
              : item,
          ),
        );
        toast.success(`Post rescheduled to ${overDate}`);
      }
    },
    [],
  );

  const activeItem = useMemo(
    () => calendarItems.find((i) => i.id === activeId),
    [calendarItems, activeId],
  );

  const navigateDate = useCallback(
    (delta: number) => {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        if (mode === "week") d.setDate(d.getDate() + delta * 7);
        else if (mode === "month") d.setMonth(d.getMonth() + delta);
        else d.setMonth(d.getMonth() + delta * 3);
        return d;
      });
    },
    [mode],
  );

  // ── week view data ──────────
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => {
    const today = new Date();
    return WEEKDAYS.map((name, i) => ({
      name,
      date: addDays(weekStart, i),
      isToday: isSameDay(addDays(weekStart, i), today),
    }));
  }, [weekStart]);

  // ── month view data ─────────
  const monthSlots = useMemo(
    () => (mode === "month" ? getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()) : []),
    [mode, currentDate],
  );
  const quarterMonths = useMemo(
    () => (mode === "quarter" ? getQuarterMonths(currentDate) : []),
    [mode, currentDate],
  );

  // Map scheduled drafts by day-of-week name
  const draftsByDay = useMemo(() => {
    const map = new Map<string, ContentDraftRecord[]>();
    for (const draft of scheduledDrafts) {
      if (!draft.scheduledAt) continue;
      const dayName = new Date(draft.scheduledAt).toLocaleDateString("en-US", { weekday: "long" });
      if (!map.has(dayName)) map.set(dayName, []);
      map.get(dayName)!.push(draft);
    }
    return map;
  }, [scheduledDrafts]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportCalendar = useCallback(
    async (format: "csv" | "ics") => {
      const response = await fetch(`/api/calendar/export?format=${format}`);
      if (!response.ok) {
        toast.error(`Failed to export ${format.toUpperCase()} calendar`);
        return;
      }
      const blob = await response.blob();
      const suffix = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `conduit-calendar-${suffix}.${format}`);
      toast.success(`Calendar exported as ${format.toUpperCase()}`);
    },
    [downloadBlob],
  );

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

  const dateLabel =
    mode === "week"
      ? `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : mode === "month"
        ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : `${quarterMonths[0]?.toLocaleDateString("en-US", { month: "short" })} – ${quarterMonths[2]?.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Header with mode toggle + navigation */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CalendarDays className="size-3" />
              Calendar
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag posts between days to reschedule. Toggle between week, month, and quarter views.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border/80 p-0.5">
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "week" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("week")}
            >
              Week
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "month" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("month")}
            >
              Month
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "quarter" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("quarter")}
            >
              Quarter
            </button>
          </div>
          <div className="inline-flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">{dateLabel}</span>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleExportCalendar("csv")}>
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExportCalendar("ics")}>
            <Download className="mr-1.5 size-3.5" />
            Export ICS
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Conflict banner */}
      {searchParams.get("from") === "onboarding" ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
          Month 1 calendar generated from your strategy. Review slots, then generate drafts only for posts you want to execute.
        </div>
      ) : null}
      <ConflictBanner items={calendarItems} />

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" />
            Weekly Posting Heatmap
          </CardTitle>
          <CardDescription>Post distribution across the week</CardDescription>
        </CardHeader>
        <CardContent>
          <PostingHeatmap items={calendarItems} />
        </CardContent>
      </Card>

      {/* Calendar grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {mode === "week" ? (
          <div className="grid gap-3 xl:grid-cols-7">
            {weekDays.map(({ name, date, isToday }) => {
              const dateKey = toIsoDate(date);
              const dayItems = calendarItems.filter((item) =>
                item.date ? item.date === dateKey : item.day === name
              );
              const dayDrafts = draftsByDay.get(name) ?? [];
              return (
                <Card key={name} className={isToday ? "ring-2 ring-primary/50" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{name}</span>
                      {isToday && <Badge variant="default" className="text-[10px]">Today</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {dayItems.length + dayDrafts.length} {dayItems.length + dayDrafts.length === 1 ? "post" : "posts"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div id={dateKey} className="space-y-2">
                      {dayDrafts.map((draft) => (
                        <ScheduledDraftItem key={draft.id} draft={draft} />
                      ))}
                      {dayItems.length === 0 && dayDrafts.length === 0 ? (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Free day for engagement or spontaneous content.
                        </div>
                      ) : (
                        dayItems.map((item) => (
                          <SortableCalendarItem key={item.id} item={item} />
                        ))
                      )}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : mode === "month" ? (
          /* Month view grid */
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {d.slice(0, 3)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthSlots.map((slot, i) => {
                const dayKey = toIsoDate(slot.date);
                const dayName = slot.date.toLocaleDateString("en-US", { weekday: "long" });
                const dayItems = calendarItems.filter((item) =>
                  item.date ? item.date === dayKey : item.day === dayName
                );
                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r p-1.5 ${
                      !slot.isCurrentMonth ? "bg-muted/30 opacity-40" : ""
                    } ${slot.isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        slot.isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {slot.label}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] ${PLATFORM_COLORS[item.platform] ?? "bg-muted"}`}
                        >
                          {item.time} {item.idea ? item.idea.slice(0, 22) : PLATFORM_LABELS[item.platform]?.slice(0, 4)}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <p className="px-1 text-[10px] text-muted-foreground">
                          +{dayItems.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {quarterMonths.map((monthDate) => {
              const slots = getMonthGrid(monthDate.getFullYear(), monthDate.getMonth());
              return (
                <div key={monthDate.toISOString()} className="overflow-hidden rounded-xl border">
                  <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">
                    {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                  <div className="grid grid-cols-7 border-b bg-muted/30">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="px-1 py-1 text-center text-[10px] font-medium text-muted-foreground">
                        {d.slice(0, 3)}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {slots.map((slot, i) => {
                      const dayKey = toIsoDate(slot.date);
                      const dayName = slot.date.toLocaleDateString("en-US", { weekday: "long" });
                      const dayItems = calendarItems.filter((item) =>
                        item.date ? item.date === dayKey : item.day === dayName
                      );
                      return (
                        <div
                          key={i}
                          className={`min-h-[72px] border-b border-r p-1 ${
                            !slot.isCurrentMonth ? "bg-muted/20 opacity-40" : ""
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground">{slot.label}</span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayItems.slice(0, 2).map((item) => (
                              <div
                                key={item.id}
                                className={`truncate rounded px-1 py-0.5 text-[10px] ${PLATFORM_COLORS[item.platform] ?? "bg-muted"}`}
                              >
                                {item.time}
                              </div>
                            ))}
                            {dayItems.length > 2 && (
                              <div className="text-[10px] text-muted-foreground">+{dayItems.length - 2}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DragOverlay>
          {activeItem && (
            <div className={`rounded-lg border p-2 text-sm shadow-lg ${PLATFORM_COLORS[activeItem.platform] ?? "bg-muted"}`}>
              <span className="font-medium">{PLATFORM_LABELS[activeItem.platform] ?? activeItem.platform}</span>
              <p className="text-xs">{activeItem.theme}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
