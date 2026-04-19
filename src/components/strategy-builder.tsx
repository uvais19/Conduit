"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Sparkles, Save, Lightbulb, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { listToText, textToList } from "@/lib/brand/manifesto";
import type { FullStrategySuggestResponse, SuggestionItem } from "@/lib/strategy/suggest-types";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import type { ContentStrategy } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlatformScheduleRow = ContentStrategy["schedule"][number];
type ContentMixEntry = PlatformScheduleRow["contentMix"][number];

const SCHEDULE_CONTENT_TYPES: ContentMixEntry["type"][] = [
  "image",
  "carousel",
  "video",
  "story",
  "text-only",
  "thread",
  "poll",
  "reel",
];

// ============================================================
// Tooltip descriptions for each field
// ============================================================

const FIELD_HINTS = {
  pillarName:
    "A concise label for a core content theme your brand will consistently post about, e.g. 'Education', 'Customer Success', 'Behind the Scenes'.",
  pillarDescription:
    "A 1-2 sentence explanation of what this pillar covers and why it resonates with your target audience.",
  pillarPercentage:
    "The share of your total content output dedicated to this pillar. All pillar percentages should ideally add up to 100%.",
  platform:
    "The social media channel this schedule applies to. Each platform has different audience behaviour and content norms.",
  postsPerWeek:
    "How many posts to publish per week on this platform. Consider your team capacity and audience expectations — quality over quantity.",
  preferredDays:
    "Days of the week when your audience is most active on this platform. Enter one day per line.",
  preferredTimes:
    "Optimal posting windows for this platform based on audience timezone and engagement patterns. Enter one time per line (e.g. 09:00).",
  contentMix:
    "Target share of each post format (e.g. reels vs carousels). Percentages are planning weights — aim for roughly 100% across rows for that platform.",
  weekNumber: "The week number in the 4-week monthly cycle.",
  weekTheme:
    "The overarching focus for this week's content across all platforms. Keeps messaging cohesive.",
  weekPillar:
    "Which content pillar this week's theme maps to. Ensures every pillar gets regular attention.",
  weekKeyMessage:
    "The single takeaway or call-to-action that unifies all posts during this week.",
} as const;

/** Dedupes React Strict Mode double mount + overlapping effects for first-time strategy generation. */
let initialStrategyGenerationPromise: Promise<void> | null = null;

type StrategyGenerateDonePayload = {
  strategy: ContentStrategy;
  version: number;
};

async function consumeStrategyGenerateStream(
  response: Response,
  callbacks: {
    onProgress: (message: string) => void;
    onDone: (payload: StrategyGenerateDonePayload) => void;
  }
): Promise<void> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok && !contentType.includes("text/event-stream")) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Unable to generate strategy");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Unable to generate strategy");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (currentEvent === "progress") {
            callbacks.onProgress((data.message as string) || "");
          } else if (currentEvent === "done") {
            callbacks.onDone({
              strategy: data.strategy as ContentStrategy,
              version: data.version as number,
            });
          } else if (currentEvent === "error") {
            throw new Error((data.error as string) || "Strategy generation failed");
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
            throw parseError;
          }
        }
        currentEvent = "";
      }
    }
  }
}

const PILLAR_FIELD_KEYS = new Set(["name", "description", "percentage"]);
const SCHEDULE_FIELD_KEYS = new Set([
  "postsPerWeek",
  "preferredDays",
  "preferredTimes",
  "contentMix",
]);
const WEEKLY_FIELD_KEYS = new Set(["theme", "pillar", "keyMessage"]);

function propsForSuggestionSection(section: string): Set<string> | null {
  if (section === "pillars") return PILLAR_FIELD_KEYS;
  if (section === "schedule") return SCHEDULE_FIELD_KEYS;
  if (section === "weeklyThemes") return WEEKLY_FIELD_KEYS;
  return null;
}

function rowCountForSection(
  section: string,
  counts: { pillars: number; schedule: number; weeklyThemes: number }
): number {
  if (section === "pillars") return counts.pillars;
  if (section === "schedule") return counts.schedule;
  if (section === "weeklyThemes") return counts.weeklyThemes;
  return 0;
}

function suggestionCellKey(
  section: "pillars" | "schedule" | "weeklyThemes",
  rowIndex: number,
  property: string
) {
  return `${section}:${rowIndex}:${property}`;
}

function buildSuggestionLayout(
  data: FullStrategySuggestResponse,
  counts: { pillars: number; schedule: number; weeklyThemes: number }
): { byCell: Map<string, SuggestionItem[]>; unmapped: SuggestionItem[] } {
  const byCell = new Map<string, SuggestionItem[]>();
  const unmapped: SuggestionItem[] = [];

  const all = [
    ...data.pillars.suggestions,
    ...data.schedule.suggestions,
    ...data.weeklyThemes.suggestions,
  ];

  for (const item of all) {
    const t = item.target;
    if (!t || typeof t !== "object") {
      unmapped.push(item);
      continue;
    }

    const section = "section" in t && typeof (t as { section: unknown }).section === "string"
      ? (t as { section: string }).section
      : "";
    const rowIndex = "rowIndex" in t && typeof (t as { rowIndex: unknown }).rowIndex === "number"
      ? (t as { rowIndex: number }).rowIndex
      : NaN;
    const property = "property" in t && typeof (t as { property: unknown }).property === "string"
      ? (t as { property: string }).property
      : "";

    const props = propsForSuggestionSection(section);
    const max = rowCountForSection(section, counts);

    if (
      !props ||
      !Number.isFinite(rowIndex) ||
      rowIndex < 0 ||
      rowIndex >= max ||
      !property ||
      !props.has(property)
    ) {
      unmapped.push(item);
      continue;
    }

    const key = suggestionCellKey(
      section as "pillars" | "schedule" | "weeklyThemes",
      rowIndex,
      property
    );
    const list = byCell.get(key) ?? [];
    list.push(item);
    byCell.set(key, list);
  }

  return { byCell, unmapped };
}

// ============================================================
// Full-strategy AI preview (shows literal from → to values)
// ============================================================

function InlineFieldSuggestions({ items }: { items: SuggestionItem[] }) {
  if (items.length === 0) return null;

  return (
    <aside className="flex w-full min-w-0 flex-col gap-2 lg:max-w-[13.5rem] lg:shrink-0">
      {items.map((s, i) => (
        <div
          key={`${s.field}-${i}`}
          className="rounded-md border border-violet-200/90 bg-violet-50/90 p-2.5 text-xs shadow-sm dark:border-violet-800/80 dark:bg-violet-950/35"
        >
          <div className="mb-1.5 flex items-center gap-1 font-medium text-violet-800 dark:text-violet-200">
            <Sparkles className="size-3 shrink-0" />
            <span className="leading-tight">AI suggestion</span>
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</span>
              <p className="mt-0.5 rounded bg-muted/60 px-1.5 py-1 line-through decoration-muted-foreground/60">
                {s.current?.trim() ? s.current : "—"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</span>
              <p className="mt-0.5 rounded border border-violet-200/80 bg-white/90 px-1.5 py-1 font-medium text-violet-950 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-50">
                {s.suggested?.trim() ? s.suggested : "—"}
              </p>
            </div>
          </div>
          {s.reasoning?.trim() ? (
            <p className="mt-2 border-t border-violet-200/70 pt-2 text-[11px] leading-snug text-muted-foreground dark:border-violet-800/60">
              {s.reasoning}
            </p>
          ) : null}
        </div>
      ))}
    </aside>
  );
}

function SuggestionDiffList({ items }: { items: SuggestionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No line-by-line diff for this block — values may still be updated holistically when you apply.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((s, i) => (
        <li
          key={`${s.field}-${i}`}
          className="rounded-md border border-violet-200/80 bg-white p-3 text-sm dark:border-violet-800/80 dark:bg-violet-950/25"
        >
          <div className="font-medium text-violet-800 dark:text-violet-200">{s.field}</div>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</span>
            <span className="min-w-0 flex-1 rounded bg-muted/50 px-2 py-1 text-sm line-through decoration-muted-foreground/50">
              {s.current?.trim() ? s.current : "—"}
            </span>
            <span className="hidden text-muted-foreground sm:inline" aria-hidden>
              →
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:ml-0">To</span>
            <span className="min-w-0 flex-1 rounded border border-violet-200 bg-violet-50/80 px-2 py-1 text-sm font-medium text-violet-950 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100">
              {s.suggested?.trim() ? s.suggested : "—"}
            </span>
          </div>
          {s.reasoning?.trim() ? (
            <p className="mt-2 border-t border-violet-100 pt-2 text-xs text-muted-foreground dark:border-violet-800/60">
              {s.reasoning}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FullStrategySuggestionPanel({
  summary,
  unmapped,
  onApply,
  onDismiss,
}: {
  summary: string;
  unmapped: SuggestionItem[];
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-violet-300 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-800 dark:text-violet-200">
          <Sparkles className="size-4 shrink-0" />
          <span>Suggested updates (full strategy)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-violet-300 text-violet-800 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/50"
            onClick={onApply}
          >
            <Check className="mr-1 size-3.5" />
            Apply to all sections
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={onDismiss}>
            <X className="mr-1 size-3.5" />
            Dismiss
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Detailed changes appear beside each field below. Use Apply to update every section at once.
      </p>
      {unmapped.length > 0 ? (
        <div className="mt-4 border-t border-violet-200/80 pt-4 dark:border-violet-800/60">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Other suggestions</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            These could not be matched to a specific field automatically — review before applying.
          </p>
          <SuggestionDiffList items={unmapped} />
        </div>
      ) : null}
    </div>
  );
}

export function StrategyBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [onboardingWelcome, setOnboardingWelcome] = useState(false);

  const [strategy, setStrategy] = useState<ContentStrategy>(createDefaultStrategy());
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generationStep, setGenerationStep] = useState("");

  const [suggestingStrategy, setSuggestingStrategy] = useState(false);
  const [fullSuggestion, setFullSuggestion] = useState<FullStrategySuggestResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("from") !== "onboarding") return;
    setOnboardingWelcome(true);
    router.replace("/strategy", { scroll: false });
  }, [searchParams, router]);

  const handleSuggestFullStrategy = useCallback(async () => {
    setSuggestingStrategy(true);
    setFullSuggestion(null);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/strategy/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "all", currentStrategy: strategy }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get suggestions");
      }

      if (data.section !== "all" || !data.pillars || !data.schedule || !data.weeklyThemes) {
        throw new Error("Unexpected response from suggestion service");
      }

      setFullSuggestion(data as FullStrategySuggestResponse);
    } catch (suggestError) {
      setError(suggestError instanceof Error ? suggestError.message : "Unable to get suggestions");
    } finally {
      setSuggestingStrategy(false);
    }
  }, [strategy]);

  const applyFullSuggestion = useCallback(() => {
    if (!fullSuggestion) return;

    setStrategy((current) => ({
      ...current,
      pillars: fullSuggestion.pillars.updatedSection as ContentStrategy["pillars"],
      schedule: fullSuggestion.schedule.updatedSection as ContentStrategy["schedule"],
      weeklyThemes: fullSuggestion.weeklyThemes.updatedSection as ContentStrategy["weeklyThemes"],
    }));

    setMessage("AI suggestions applied across pillars, schedule, and weekly themes. Review and save when ready.");
    setFullSuggestion(null);
  }, [fullSuggestion]);

  const dismissFullSuggestion = useCallback(() => {
    setFullSuggestion(null);
  }, []);

  const suggestionLayout = useMemo(() => {
    if (!fullSuggestion) return null;
    return buildSuggestionLayout(fullSuggestion, {
      pillars: strategy.pillars.length,
      schedule: strategy.schedule.length,
      weeklyThemes: strategy.weeklyThemes.length,
    });
  }, [fullSuggestion, strategy.pillars.length, strategy.schedule.length, strategy.weeklyThemes.length]);

  const runStrategyGeneration = useCallback(
    async (successMessage: string) => {
      setGenerating(true);
      setMessage("");
      setError("");
      setGenerationStep("");

      try {
        const response = await fetch("/api/strategy/generate", { method: "POST" });
        await consumeStrategyGenerateStream(response, {
          onProgress: (step) => setGenerationStep(step),
          onDone: ({ strategy: nextStrategy, version: nextVersion }) => {
            setStrategy(nextStrategy);
            setVersion(nextVersion);
            setMessage(successMessage);
            void router.refresh();
          },
        });
      } catch (generateError) {
        setError(
          generateError instanceof Error ? generateError.message : "Unable to generate strategy"
        );
        throw generateError;
      } finally {
        setGenerating(false);
        setGenerationStep("");
      }
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;

    async function initStrategy() {
      try {
        const response = await fetch("/api/strategy", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load strategy");
        }

        if (cancelled) return;

        if (data.strategy) {
          setStrategy(data.strategy as ContentStrategy);
          setVersion(data.version);
          return;
        }

        setGenerating(true);
        setMessage("");
        setError("");
        setGenerationStep("");

        const runInitial = async () => {
          if (initialStrategyGenerationPromise) {
            await initialStrategyGenerationPromise;
            return;
          }
          initialStrategyGenerationPromise = (async () => {
            try {
              const genResponse = await fetch("/api/strategy/generate", { method: "POST" });
              await consumeStrategyGenerateStream(genResponse, {
                onProgress: (step) => setGenerationStep(step),
                onDone: ({ strategy: nextStrategy, version: nextVersion }) => {
                  setStrategy(nextStrategy);
                  setVersion(nextVersion);
                  setMessage(
                    "Your strategy is ready — review below, then save. You can regenerate anytime to create a new version from your manifesto and latest analyses."
                  );
                  void router.refresh();
                },
              });
            } finally {
              initialStrategyGenerationPromise = null;
            }
          })();

          await initialStrategyGenerationPromise;
        };

        await runInitial();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load strategy");
        }
      } finally {
        setLoading(false);
        setGenerating(false);
        setGenerationStep("");
      }
    }

    void initStrategy();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleRegenerate() {
    try {
      await runStrategyGeneration(
        "New strategy version generated — review changes, then save when you are happy."
      );
    } catch {
      /* runStrategyGeneration already set error */
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/strategy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save strategy");
      }

      // Reload via GET so the form matches exactly what GET returns (same ordering / row as DB).
      const reload = await fetch(`/api/strategy?_=${Date.now()}`, { cache: "no-store" });
      const reloaded = await reload.json();
      if (reload.ok && reloaded.strategy) {
        setStrategy(reloaded.strategy as ContentStrategy);
        setVersion(reloaded.version);
        setMessage(`Strategy saved successfully as version ${reloaded.version}.`);
      } else {
        setStrategy(data.strategy as ContentStrategy);
        setVersion(data.version as number);
        setMessage(`Strategy saved successfully as version ${data.version}.`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save strategy");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-3">
        <p className="text-sm text-muted-foreground">
          {generating
            ? generationStep || "Building your strategy from your brand manifesto…"
            : "Loading your content strategy…"}
        </p>
        {generating ? (
          <div className="space-y-1.5">
            <Progress value={generationStep ? 50 : 15} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {generationStep || "Preparing generation pipeline…"}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="animate-pulse-dot" />
              Strategy
            </span>
            {version && <Badge variant="secondary" className="text-xs">Version {version}</Badge>}
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Content Strategy
          </h1>
          <p className="text-sm text-muted-foreground">
            Your pillars, cadence, and weekly themes — edit anytime, then save.{" "}
            <Link href="/content/drafts" className="text-primary underline-offset-4 hover:underline">
              Go to content drafts
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={saving || generating} className="shadow-md glow-primary">
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save strategy"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRegenerate()}
              disabled={generating || saving}
            >
              <Sparkles className="mr-2 size-4" />
              {generating ? generationStep || "Regenerating…" : "Regenerate strategy"}
            </Button>
            {generating ? (
              <div className="w-full space-y-1.5 md:w-auto md:min-w-[16rem]">
                <Progress value={generationStep ? 50 : 15} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {generationStep || "Preparing generation pipeline…"}
                </p>
              </div>
            ) : null}
          </div>
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger
              type="button"
              className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <ChevronDown
                className={cn("size-4 shrink-0 transition-transform", advancedOpen && "rotate-180")}
              />
              Advanced: AI suggestions
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-w-2xl space-y-2 rounded-md border border-border bg-muted/10 p-3 text-sm">
              <p className="text-muted-foreground">
                Get field-level suggestions across pillars, schedule, and weekly themes. Review each change, then apply and save.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-300 text-violet-800 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/40"
                disabled={generating || suggestingStrategy}
                onClick={() => void handleSuggestFullStrategy()}
              >
                <Lightbulb className="mr-2 size-4" />
                {suggestingStrategy ? "Analysing strategy..." : "Suggest with AI"}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </header>

      {onboardingWelcome ? (
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm text-foreground">
          <p>
            Welcome — we built this first draft from your brand manifesto. Adjust anything you like, then save.
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOnboardingWelcome(false)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {message && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700">{message}</div>
      )}
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {fullSuggestion && suggestionLayout && (
        <FullStrategySuggestionPanel
          summary={fullSuggestion.summary}
          unmapped={suggestionLayout.unmapped}
          onApply={applyFullSuggestion}
          onDismiss={dismissFullSuggestion}
        />
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Content pillars</CardTitle>
            <CardDescription>
              The 3-5 core topic categories all your content revolves around. Good pillars are distinct, audience-aligned, and cover the full buyer journey.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {strategy.pillars.map((pillar, index) => (
            <div key={`${pillar.name}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_2fr_120px]">
              <div className="space-y-2">
                <FieldLabelWithHint label="Pillar name" hint={FIELD_HINTS.pillarName} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={pillar.name}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          pillars: current.pillars.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("pillars", index, "name")) ?? []}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint label="Description" hint={FIELD_HINTS.pillarDescription} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={pillar.description}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          pillars: current.pillars.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("pillars", index, "description")) ?? []}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint label="Percentage" hint={FIELD_HINTS.pillarPercentage} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pillar.percentage}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          pillars: current.pillars.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, percentage: Number(event.target.value) || 0 }
                              : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("pillars", index, "percentage")) ?? []}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Platform schedule</CardTitle>
            <CardDescription>
              Control posting frequency, preferred days, and content format mix per platform. Best practices vary by channel.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {strategy.schedule.map((schedule, index) => (
            <div key={`${schedule.platform}-${index}`} className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabelWithHint label="Platform" hint={FIELD_HINTS.platform} />
                  <Input value={schedule.platform} disabled />
                </div>
                <div className="space-y-2">
                  <FieldLabelWithHint label="Posts per week" hint={FIELD_HINTS.postsPerWeek} />
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                    <div className="min-w-0 flex-1">
                      <Input
                        type="number"
                        min={1}
                        max={21}
                        value={schedule.postsPerWeek}
                        onChange={(event) =>
                          setStrategy((current) => ({
                            ...current,
                            schedule: current.schedule.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, postsPerWeek: Number(event.target.value) || 1 }
                                : item
                            ),
                          }))
                        }
                      />
                    </div>
                    <InlineFieldSuggestions
                      items={suggestionLayout?.byCell.get(suggestionCellKey("schedule", index, "postsPerWeek")) ?? []}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabelWithHint label="Preferred days" hint={FIELD_HINTS.preferredDays} />
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                    <div className="min-w-0 flex-1">
                      <textarea
                        className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={listToText(schedule.preferredDays)}
                        onChange={(event) =>
                          setStrategy((current) => ({
                            ...current,
                            schedule: current.schedule.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, preferredDays: textToList(event.target.value) }
                                : item
                            ),
                          }))
                        }
                      />
                    </div>
                    <InlineFieldSuggestions
                      items={suggestionLayout?.byCell.get(suggestionCellKey("schedule", index, "preferredDays")) ?? []}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabelWithHint label="Preferred times" hint={FIELD_HINTS.preferredTimes} />
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                    <div className="min-w-0 flex-1">
                      <textarea
                        className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={listToText(schedule.preferredTimes)}
                        onChange={(event) =>
                          setStrategy((current) => ({
                            ...current,
                            schedule: current.schedule.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, preferredTimes: textToList(event.target.value) }
                                : item
                            ),
                          }))
                        }
                      />
                    </div>
                    <InlineFieldSuggestions
                      items={suggestionLayout?.byCell.get(suggestionCellKey("schedule", index, "preferredTimes")) ?? []}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <FieldLabelWithHint label="Content format mix" hint={FIELD_HINTS.contentMix} />
                <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {schedule.contentMix.map((mixRow, mixIndex) => (
                      <div
                        key={`${schedule.platform}-mix-${mixIndex}`}
                        className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-2 py-2"
                      >
                        <select
                          className="h-9 min-w-[8.5rem] flex-1 rounded-md border bg-background px-2 text-sm md:max-w-[11rem]"
                          value={mixRow.type}
                          onChange={(event) => {
                            const value = event.target.value as ContentMixEntry["type"];
                            setStrategy((current) => ({
                              ...current,
                              schedule: current.schedule.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      contentMix: item.contentMix.map((row, j) =>
                                        j === mixIndex ? { ...row, type: value } : row
                                      ),
                                    }
                                  : item
                              ),
                            }));
                          }}
                        >
                          {SCHEDULE_CONTENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace(/-/g, " ")}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 w-20"
                          value={mixRow.percentage}
                          onChange={(event) =>
                            setStrategy((current) => ({
                              ...current,
                              schedule: current.schedule.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      contentMix: item.contentMix.map((row, j) =>
                                        j === mixIndex
                                          ? { ...row, percentage: Number(event.target.value) || 0 }
                                          : row
                                      ),
                                    }
                                  : item
                              ),
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 text-muted-foreground"
                          disabled={schedule.contentMix.length <= 1}
                          onClick={() =>
                            setStrategy((current) => ({
                              ...current,
                              schedule: current.schedule.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      contentMix: item.contentMix.filter((_, j) => j !== mixIndex),
                                    }
                                  : item
                              ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        setStrategy((current) => ({
                          ...current,
                          schedule: current.schedule.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  contentMix: [
                                    ...item.contentMix,
                                    { type: "image", percentage: 0 },
                                  ],
                                }
                              : item
                          ),
                        }))
                      }
                    >
                      Add format
                    </Button>
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("schedule", index, "contentMix")) ?? []}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Weekly themes</CardTitle>
            <CardDescription>
              A 4-week rotating cadence that keeps content cohesive. Effective themes follow a narrative arc: educate → build trust → convert → re-engage.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {strategy.weeklyThemes.map((theme, index) => (
            <div key={`${theme.weekNumber}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <FieldLabelWithHint label="Week" hint={FIELD_HINTS.weekNumber} />
                <Input value={theme.weekNumber} disabled />
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint label="Theme" hint={FIELD_HINTS.weekTheme} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={theme.theme}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          weeklyThemes: current.weeklyThemes.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, theme: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("weeklyThemes", index, "theme")) ?? []}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint label="Pillar" hint={FIELD_HINTS.weekPillar} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={theme.pillar}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          weeklyThemes: current.weeklyThemes.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, pillar: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("weeklyThemes", index, "pillar")) ?? []}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint label="Key message" hint={FIELD_HINTS.weekKeyMessage} />
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={theme.keyMessage}
                      onChange={(event) =>
                        setStrategy((current) => ({
                          ...current,
                          weeklyThemes: current.weeklyThemes.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, keyMessage: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <InlineFieldSuggestions
                    items={suggestionLayout?.byCell.get(suggestionCellKey("weeklyThemes", index, "keyMessage")) ?? []}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
