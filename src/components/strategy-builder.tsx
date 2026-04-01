"use client";

import { useEffect, useState } from "react";
import { Sparkles, Save } from "lucide-react";
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
import { listToText, textToList } from "@/lib/brand/manifesto";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import type { ContentStrategy } from "@/lib/types";

export function StrategyBuilder() {
  const [strategy, setStrategy] = useState<ContentStrategy>(createDefaultStrategy());
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    try {
      const response = await fetch("/api/strategy/generate", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate strategy");
      }

      setStrategy(data.strategy as ContentStrategy);
      setVersion(data.version as number);
      setMessage(`Strategy generated successfully as version ${data.version}.`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate strategy");
    } finally {
      setGenerating(false);
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
            {generating ? "Generating..." : "Generate strategy"}
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
          <CardTitle>Content pillars</CardTitle>
          <CardDescription>
            These define the main themes Conduit will use when generating content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.pillars.map((pillar, index) => (
            <div key={`${pillar.name}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_2fr_120px]">
              <div className="space-y-2">
                <Label>Pillar name</Label>
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
                <Label>Description</Label>
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
                <Label>Percentage</Label>
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
          <CardTitle>Platform schedule</CardTitle>
          <CardDescription>
            Set posting frequency, preferred days, and preferred times per platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.schedule.map((schedule, index) => (
            <div key={`${schedule.platform}-${index}`} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Input value={schedule.platform} disabled />
              </div>
              <div className="space-y-2">
                <Label>Posts per week</Label>
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
                <Label>Preferred days</Label>
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
                <Label>Preferred times</Label>
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
          <CardTitle>Weekly themes</CardTitle>
          <CardDescription>
            These weekly anchors help the content calendar stay coherent across platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.weeklyThemes.map((theme, index) => (
            <div key={`${theme.weekNumber}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Week</Label>
                <Input value={theme.weekNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
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
                <Label>Pillar</Label>
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
                <Label>Key message</Label>
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
