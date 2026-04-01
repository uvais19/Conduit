"use client";

import { useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type GenerationPayload = {
  platform: (typeof PLATFORMS)[number];
  pillar: string;
  topic: string;
  objective: string;
  audience: string;
  voice: string;
  cta: string;
  generateVariants: boolean;
};

const initialPayload: GenerationPayload = {
  platform: "linkedin",
  pillar: "Thought Leadership",
  topic: "How to turn one customer call into 7 social content ideas",
  objective: "engagement",
  audience: "Founders and marketing leads",
  voice: "clear, practical, and confident",
  cta: "Comment 'PLAYBOOK' and we will send you the framework",
  generateVariants: true,
};

export function ContentGenerationStudio() {
  const [payload, setPayload] = useState<GenerationPayload>(initialPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);

  const grouped = useMemo(() => {
    return drafts.sort((a, b) => a.variantLabel.localeCompare(b.variantLabel));
  }, [drafts]);

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content");
      }

      setDrafts(data.drafts as ContentDraftRecord[]);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate content"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Content</h1>
        <p className="text-muted-foreground">
          Pick platform + pillar, then generate draft variants side-by-side.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prompt Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            Platform
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={payload.platform}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  platform: event.target.value as GenerationPayload["platform"],
                }))
              }
            >
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            Pillar
            <Input
              value={payload.pillar}
              onChange={(event) =>
                setPayload((current) => ({ ...current, pillar: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            Topic
            <Input
              value={payload.topic}
              onChange={(event) =>
                setPayload((current) => ({ ...current, topic: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            Objective
            <Input
              value={payload.objective}
              onChange={(event) =>
                setPayload((current) => ({ ...current, objective: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            Audience
            <Input
              value={payload.audience}
              onChange={(event) =>
                setPayload((current) => ({ ...current, audience: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            Voice
            <Input
              value={payload.voice}
              onChange={(event) =>
                setPayload((current) => ({ ...current, voice: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            CTA
            <Input
              value={payload.cta}
              onChange={(event) =>
                setPayload((current) => ({ ...current, cta: event.target.value }))
              }
            />
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={payload.generateVariants}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  generateVariants: event.target.checked,
                }))
              }
            />
            Generate A/B/C variants
          </label>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Drafts"}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((draft) => (
          <Card key={draft.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Variant {draft.variantLabel} · {PLATFORM_LABELS[draft.platform]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{draft.caption}</p>
              <p className="text-muted-foreground">{draft.hashtags.join(" ")}</p>
              <p className="font-medium">CTA: {draft.cta}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
