"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto } from "@/lib/types";
import { deriveFieldsForPlatform } from "@/lib/content/platform-defaults";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DraftMediaGallery } from "@/components/draft-media-gallery";
import { DraftVisualEditor } from "@/components/draft-visual-editor";

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
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<GenerationPayload>(initialPayload);
  const [manifesto, setManifesto] = useState<BrandManifesto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [generatingVariant, setGeneratingVariant] = useState<string | null>(null);

  useEffect(() => {
    async function loadManifesto() {
      try {
        const response = await fetch("/api/brand");
        const data = await response.json();
        if (response.ok && data.manifesto) {
          const loaded = data.manifesto as BrandManifesto;
          setManifesto(loaded);
          const audience = [
            loaded.primaryAudience.demographics,
            loaded.primaryAudience.psychographics,
          ]
            .filter(Boolean)
            .join("; ");
          const derived = deriveFieldsForPlatform(loaded, payload.platform);
          setPayload((current) => ({ ...current, audience, ...derived }));
        }
      } catch {
        // Manifesto is optional — ignore errors
      }
    }
    void loadManifesto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!manifesto) return;
    const derived = deriveFieldsForPlatform(manifesto, payload.platform);
    setPayload((current) => ({ ...current, ...derived }));
  }, [payload.platform, manifesto]);

  useEffect(() => {
    const platform = searchParams.get("platform");
    const pillar = searchParams.get("pillar");
    const topic = searchParams.get("topic");

    if (platform || pillar || topic) {
      setPayload((current) => ({
        ...current,
        ...(platform && PLATFORMS.includes(platform as (typeof PLATFORMS)[number]) && { platform: platform as (typeof PLATFORMS)[number] }),
        ...(pillar && { pillar }),
        ...(topic && { topic }),
      }));
    }
  }, [searchParams]);

  const grouped = useMemo(() => {
    return drafts.sort((a, b) => a.variantLabel.localeCompare(b.variantLabel));
  }, [drafts]);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedId) ?? null,
    [drafts, selectedId]
  );

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setDrafts([]);
    setGeneratingVariant(null);

    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate content");
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
                if (data.phase === "visual") {
                  setGeneratingVariant("visual");
                } else if (data.variant) {
                  setGeneratingVariant(data.variant as string);
                }
              } else if (currentEvent === "done") {
                setDrafts(data.drafts as ContentDraftRecord[]);
                setSelectedId((data.drafts as ContentDraftRecord[])[0]?.id ?? "");
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
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate content"
      );
    } finally {
      setLoading(false);
      setGeneratingVariant(null);
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
              {loading
                ? generatingVariant === "visual"
                  ? "Designing visuals & carousel..."
                  : generatingVariant
                    ? `Generating variant ${generatingVariant}...`
                    : "Generating..."
                : "Generate Drafts"}
            </button>
          </div>
        </CardContent>
      </Card>

      {grouped.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold leading-snug">
              {payload.topic.trim() || payload.pillar || "Generated drafts"}
            </CardTitle>
            <CardDescription>
              {payload.pillar}
              {payload.pillar ? " · " : ""}
              {PLATFORM_LABELS[payload.platform]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.map((draft) => (
                <div
                  key={draft.id}
                  className={`flex flex-col rounded-lg border p-3 text-sm ${
                    selectedId === draft.id ? "border-primary ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Variant {draft.variantLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedId(draft.id)}
                      className="shrink-0 rounded border px-2 py-1 text-xs"
                    >
                      Edit visuals
                    </button>
                  </div>
                  <p className="flex-1 whitespace-pre-wrap text-sm">{draft.caption}</p>
                  <p className="mt-2 text-muted-foreground text-xs">{draft.hashtags.join(" ")}</p>
                  <p className="mt-1 text-xs font-medium">CTA: {draft.cta}</p>
                  {draft.mediaUrls.length > 0 && (
                    <div className="mt-3">
                      <DraftMediaGallery
                        key={draft.mediaUrls.join("|")}
                        urls={draft.mediaUrls}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDraft && (
        <DraftVisualEditor
          draft={selectedDraft}
          onDraftChange={(nextDraft) => {
            setDrafts((current) =>
              current.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft))
            );
          }}
        />
      )}
    </div>
  );
}
