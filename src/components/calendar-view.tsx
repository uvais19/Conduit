"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ContentStrategy } from "@/lib/types";
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
type CalendarMode = "week" | "month";
type DaySlot = { date: Date; label: string; isToday: boolean; isCurrentMonth: boolean };

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  facebook: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  linkedin: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  x: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300",
  gbp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
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
      const key = `${item.day}-${item.time}-${item.platform}`;
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
        if (strat) setCalendarItems(buildCalendarPreview(strat));
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
      const overDay = String(over.id);
      if (WEEKDAYS.includes(overDay as (typeof WEEKDAYS)[number])) {
        setCalendarItems((prev) =>
          prev.map((item) =>
            item.id === String(active.id) ? { ...item, day: overDay } : item,
          ),
        );
        toast.success(`Post rescheduled to ${overDay}`);
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
        else d.setMonth(d.getMonth() + delta);
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

  const handleExportCalendar = useCallback(() => {
    const lines = ["Day,Time,Platform,Theme,Pillar,Content Type"];
    for (const item of calendarItems) {
      lines.push(
        [item.day, item.time, item.platform, `"${item.theme}"`, `"${item.pillar}"`, item.contentType].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-calendar.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar exported as CSV");
  }, [calendarItems]);

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
      : currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
            Drag posts between days to reschedule. Toggle between week and month views.
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
          <Button variant="outline" size="sm" onClick={handleExportCalendar}>
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Conflict banner */}
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
              const dayItems = calendarItems.filter((item) => item.day === name);
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
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
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
                const dayName = slot.date.toLocaleDateString("en-US", { weekday: "long" });
                const dayItems = calendarItems.filter((item) => item.day === dayName);
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
                          {item.time} {PLATFORM_LABELS[item.platform]?.slice(0, 4)}
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
