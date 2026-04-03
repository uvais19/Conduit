"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Save, Info, Lightbulb, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { listToText, textToList } from "@/lib/brand/manifesto";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import type { ContentStrategy } from "@/lib/types";

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
  weekNumber: "The week number in the 4-week monthly cycle.",
  weekTheme:
    "The overarching focus for this week's content across all platforms. Keeps messaging cohesive.",
  weekPillar:
    "Which content pillar this week's theme maps to. Ensures every pillar gets regular attention.",
  weekKeyMessage:
    "The single takeaway or call-to-action that unifies all posts during this week.",
} as const;

// ============================================================
// Reusable label with tooltip
// ============================================================

function FieldLabel({ htmlFor, label, hint }: { htmlFor?: string; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <Info className="size-3.5" />
          <span className="sr-only">More info about {label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ============================================================
// Types for suggestions
// ============================================================

type SuggestionItem = {
  field: string;
  current: string;
  suggested: string;
  reasoning: string;
};

type SectionSuggestion = {
  section: string;
  suggestions: SuggestionItem[];
  updatedSection: unknown;
  summary: string;
};

type SuggestingSection = "pillars" | "schedule" | "weeklyThemes" | null;

export function StrategyBuilder() {
  const [strategy, setStrategy] = useState<ContentStrategy>(createDefaultStrategy());
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generationStep, setGenerationStep] = useState("");

  // Suggest with AI state
  const [suggestingSection, setSuggestingSection] = useState<SuggestingSection>(null);
  const [sectionSuggestion, setSectionSuggestion] = useState<SectionSuggestion | null>(null);
  const [suggestionTarget, setSuggestionTarget] = useState<SuggestingSection>(null);

  const handleSuggest = useCallback(async (section: "pillars" | "schedule" | "weeklyThemes") => {
    setSuggestingSection(section);
    setSectionSuggestion(null);
    setSuggestionTarget(section);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/strategy/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, currentStrategy: strategy }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get suggestions");
      }

      setSectionSuggestion(data as SectionSuggestion);
    } catch (suggestError) {
      setError(suggestError instanceof Error ? suggestError.message : "Unable to get suggestions");
    } finally {
      setSuggestingSection(null);
    }
  }, [strategy]);

  const applySuggestion = useCallback(() => {
    if (!sectionSuggestion || !suggestionTarget) return;

    const updatedSection = sectionSuggestion.updatedSection;

    setStrategy((current) => {
      if (suggestionTarget === "pillars" && Array.isArray(updatedSection)) {
        return { ...current, pillars: updatedSection as ContentStrategy["pillars"] };
      }
      if (suggestionTarget === "schedule" && Array.isArray(updatedSection)) {
        return { ...current, schedule: updatedSection as ContentStrategy["schedule"] };
      }
      if (suggestionTarget === "weeklyThemes" && Array.isArray(updatedSection)) {
        return { ...current, weeklyThemes: updatedSection as ContentStrategy["weeklyThemes"] };
      }
      return current;
    });

    setMessage("AI suggestions applied. Review the changes and save when ready.");
    setSectionSuggestion(null);
    setSuggestionTarget(null);
  }, [sectionSuggestion, suggestionTarget]);

  const dismissSuggestion = useCallback(() => {
    setSectionSuggestion(null);
    setSuggestionTarget(null);
  }, []);

  useEffect(() => {
    async function loadStrategy() {
      try {
        const response = await fetch("/api/strategy");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load strategy");
        }

        if (data.strategy) {
          setStrategy(data.strategy as ContentStrategy);
          setVersion(data.version);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load strategy");
      } finally {
        setLoading(false);
      }
    }

    void loadStrategy();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setMessage("");
    setError("");
    setGenerationStep("");

    try {
      const response = await fetch("/api/strategy/generate", { method: "POST" });

      if (!response.ok && !response.headers.get("content-type")?.includes("text/event-stream")) {
        const data = await response.json();
        throw new Error(data.error || "Unable to generate strategy");
      }

      const reader = response.body!.getReader();
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
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "progress") {
                setGenerationStep(data.message as string);
              } else if (currentEvent === "done") {
                setStrategy(data.strategy as ContentStrategy);
                setVersion(data.version as number);
                setMessage(`Strategy generated successfully as version ${data.version}.`);
              } else if (currentEvent === "error") {
                throw new Error(data.error as string);
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
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate strategy");
    } finally {
      setGenerating(false);
      setGenerationStep("");
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
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save strategy");
      }

      setStrategy(data.strategy as ContentStrategy);
      setVersion(data.version as number);
      setMessage(`Strategy saved successfully as version ${data.version}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save strategy");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your content strategy...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Strategy</h1>
          <p className="text-muted-foreground">
            Generate and refine your pillars, posting cadence, and weekly themes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {version && <Badge variant="secondary">Version {version}</Badge>}
          <Button onClick={handleGenerate} disabled={generating}>
            <Sparkles className="mr-2 size-4" />
            {generating ? (generationStep || "Generating...") : "Generate strategy"}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save strategy"}
          </Button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content pillars</CardTitle>
              <CardDescription>
                The 3-5 core topic categories all your content revolves around. Good pillars are distinct, audience-aligned, and cover the full buyer journey.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30 shrink-0"
              disabled={suggestingSection !== null}
              onClick={() => handleSuggest("pillars")}
            >
              <Lightbulb className="mr-1.5 size-4" />
              {suggestingSection === "pillars" ? "Analysing..." : "Suggest with AI"}
            </Button>
          </div>
        </CardHeader>

        {suggestionTarget === "pillars" && sectionSuggestion && (
          <div className="mx-6 mb-2 rounded-lg border border-violet-300 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="size-4" />
                AI Suggestions
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300" onClick={applySuggestion}>
                  <Check className="mr-1 size-3" /> Apply all
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={dismissSuggestion}>
                  <X className="mr-1 size-3" /> Dismiss
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{sectionSuggestion.summary}</p>
            <ul className="space-y-2">
              {sectionSuggestion.suggestions.map((s, i) => (
                <li key={i} className="rounded-md border border-violet-200 bg-white p-3 text-sm dark:border-violet-800 dark:bg-violet-950/30">
                  <span className="font-medium text-violet-700 dark:text-violet-300">{s.field}:</span>{" "}
                  <span className="text-muted-foreground">{s.reasoning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CardContent className="space-y-4">
          {strategy.pillars.map((pillar, index) => (
            <div key={`${pillar.name}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_2fr_120px]">
              <div className="space-y-2">
                <FieldLabel label="Pillar name" hint={FIELD_HINTS.pillarName} />
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
              <div className="space-y-2">
                <FieldLabel label="Description" hint={FIELD_HINTS.pillarDescription} />
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
              <div className="space-y-2">
                <FieldLabel label="Percentage" hint={FIELD_HINTS.pillarPercentage} />
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
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Platform schedule</CardTitle>
              <CardDescription>
                Control posting frequency, preferred days, and content format mix per platform. Best practices vary by channel.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30 shrink-0"
              disabled={suggestingSection !== null}
              onClick={() => handleSuggest("schedule")}
            >
              <Lightbulb className="mr-1.5 size-4" />
              {suggestingSection === "schedule" ? "Analysing..." : "Suggest with AI"}
            </Button>
          </div>
        </CardHeader>

        {suggestionTarget === "schedule" && sectionSuggestion && (
          <div className="mx-6 mb-2 rounded-lg border border-violet-300 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="size-4" />
                AI Suggestions
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300" onClick={applySuggestion}>
                  <Check className="mr-1 size-3" /> Apply all
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={dismissSuggestion}>
                  <X className="mr-1 size-3" /> Dismiss
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{sectionSuggestion.summary}</p>
            <ul className="space-y-2">
              {sectionSuggestion.suggestions.map((s, i) => (
                <li key={i} className="rounded-md border border-violet-200 bg-white p-3 text-sm dark:border-violet-800 dark:bg-violet-950/30">
                  <span className="font-medium text-violet-700 dark:text-violet-300">{s.field}:</span>{" "}
                  <span className="text-muted-foreground">{s.reasoning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CardContent className="space-y-4">
          {strategy.schedule.map((schedule, index) => (
            <div key={`${schedule.platform}-${index}`} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel label="Platform" hint={FIELD_HINTS.platform} />
                <Input value={schedule.platform} disabled />
              </div>
              <div className="space-y-2">
                <FieldLabel label="Posts per week" hint={FIELD_HINTS.postsPerWeek} />
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
              <div className="space-y-2">
                <FieldLabel label="Preferred days" hint={FIELD_HINTS.preferredDays} />
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
              <div className="space-y-2">
                <FieldLabel label="Preferred times" hint={FIELD_HINTS.preferredTimes} />
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
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly themes</CardTitle>
              <CardDescription>
                A 4-week rotating cadence that keeps content cohesive. Effective themes follow a narrative arc: educate → build trust → convert → re-engage.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30 shrink-0"
              disabled={suggestingSection !== null}
              onClick={() => handleSuggest("weeklyThemes")}
            >
              <Lightbulb className="mr-1.5 size-4" />
              {suggestingSection === "weeklyThemes" ? "Analysing..." : "Suggest with AI"}
            </Button>
          </div>
        </CardHeader>

        {suggestionTarget === "weeklyThemes" && sectionSuggestion && (
          <div className="mx-6 mb-2 rounded-lg border border-violet-300 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="size-4" />
                AI Suggestions
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300" onClick={applySuggestion}>
                  <Check className="mr-1 size-3" /> Apply all
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={dismissSuggestion}>
                  <X className="mr-1 size-3" /> Dismiss
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{sectionSuggestion.summary}</p>
            <ul className="space-y-2">
              {sectionSuggestion.suggestions.map((s, i) => (
                <li key={i} className="rounded-md border border-violet-200 bg-white p-3 text-sm dark:border-violet-800 dark:bg-violet-950/30">
                  <span className="font-medium text-violet-700 dark:text-violet-300">{s.field}:</span>{" "}
                  <span className="text-muted-foreground">{s.reasoning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CardContent className="space-y-4">
          {strategy.weeklyThemes.map((theme, index) => (
            <div key={`${theme.weekNumber}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel label="Week" hint={FIELD_HINTS.weekNumber} />
                <Input value={theme.weekNumber} disabled />
              </div>
              <div className="space-y-2">
                <FieldLabel label="Theme" hint={FIELD_HINTS.weekTheme} />
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
              <div className="space-y-2">
                <FieldLabel label="Pillar" hint={FIELD_HINTS.weekPillar} />
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
              <div className="space-y-2">
                <FieldLabel label="Key message" hint={FIELD_HINTS.weekKeyMessage} />
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
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
