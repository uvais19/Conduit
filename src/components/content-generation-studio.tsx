"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto } from "@/lib/types";
import { deriveFieldsForPlatform } from "@/lib/content/platform-defaults";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Input } from "@/components/ui/input";
import { DraftMediaGallery } from "@/components/draft-media-gallery";
import { DraftVisualEditor } from "@/components/draft-visual-editor";
import { FieldCharCounter } from "@/components/field-char-counter";
import { ContentExplainerPanel } from "@/components/content-explainer-panel";
import { ExportDraftsButton } from "@/components/export-drafts-button";
import { Progress } from "@/components/ui/progress";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { Platform } from "@/lib/types";
import { ExplainedScoreTooltip } from "@/components/explained-score-tooltip";
import { OnBrandScoreCard } from "@/components/on-brand-score-card";

type GenerationPayload = {
  platform: (typeof PLATFORMS)[number];
  pillar: string;
  topic: string;
  objective: string;
  audience: string;
  voice: string;
  cta: string;
  generateVariants: boolean;
  /** Optional campaign — new variants are attached to this batch. */
  campaignId?: string;
};

const GENERATION_HINTS = {
  platform:
    "Which network the copy and constraints are optimized for — character limits, norms, and hashtag style all follow this choice.",
  pillar:
    "The strategy theme this post belongs to. Keeps the idea aligned with your content pillars and reporting.",
  topic:
    "The specific angle, headline, or story for this generation. Be concrete; the model uses this as the main subject.",
  objective:
    "What success looks like for this piece — e.g. engagement, saves, clicks, or conversation. Shapes hook and CTA strength.",
  audience:
    "Who should feel spoken to in this draft. Overrides default manifesto audience when you need a segment-specific version.",
  voice:
    "Tone modifiers for this run only — e.g. punchy, empathetic, executive. Layered on top of your saved brand voice.",
  cta:
    "The action you want readers to take — comment keyword, link in bio, DM, sign up. Written into the close of the caption.",
  variants:
    "When enabled, Conduit produces multiple labeled variants (e.g. A/B/C) so you can compare hooks and structures side by side.",
  campaign:
    "Optional: attach generated drafts to a named campaign so you can batch-approve and schedule them together from Campaigns.",
} as const;

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

const PLATFORM_MEDIA_SUPPORT: Record<string, { formats: string[]; maxDuration?: string; notes: string }> = {
  instagram: { formats: ["Image", "Carousel", "Reel", "Story"], maxDuration: "90s Reels, 60s Stories", notes: "Reels get 67% more reach than static posts" },
  linkedin: { formats: ["Image", "Carousel (PDF)", "Video", "Article"], maxDuration: "10 min", notes: "Native video gets 5x more engagement" },
  x: { formats: ["Image", "GIF", "Video"], maxDuration: "2:20", notes: "Videos auto-play in timeline" },
  facebook: { formats: ["Image", "Carousel", "Video", "Reel", "Story"], maxDuration: "240 min", notes: "Short-form video under 60s performs best" },
  gbp: { formats: ["Image", "Video"], maxDuration: "30s", notes: "Photos with businesses get 35% more clicks" },
};

type CampaignOption = { id: string; name: string };

export function ContentGenerationStudio() {
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<GenerationPayload>(initialPayload);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [manifesto, setManifesto] = useState<BrandManifesto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [generatingVariant, setGeneratingVariant] = useState<string | null>(null);
  const [brandCheck, setBrandCheck] = useState<{
    score: {
      overallScore: number;
      toneScore: number;
      messageAlignmentScore: number;
      guidelinesScore: number;
      source: "live" | "recomputed" | "fallback";
      computedAt: string;
    };
    issues: Array<{
      severity: "error" | "warning" | "info";
      category:
        | "tone"
        | "banned_word"
        | "missing_disclosure"
        | "off_brand"
        | "guideline_violation"
        | "length";
      message: string;
      suggestion: string;
      blocking: boolean;
    }>;
    strengths: string[];
    summary: string;
  } | null>(null);
  const [brandChecking, setBrandChecking] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [translateLang, setTranslateLang] = useState("Spanish");

  const TRANSLATE_LANGUAGES = [
    "Spanish", "French", "German", "Portuguese", "Italian", "Dutch",
    "Japanese", "Korean", "Chinese (Simplified)", "Arabic", "Hindi",
    "Russian", "Turkish", "Indonesian",
  ];

  const handleTranslate = useCallback(
    async (draftId: string) => {
      const draft = drafts.find((d) => d.id === draftId);
      if (!draft) return;
      setTranslating(draftId);
      try {
        const res = await fetch("/api/content/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: draft.caption,
            targetLanguage: translateLang,
            platform: payload.platform,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Translation failed");
        setDrafts((current) =>
          current.map((d) =>
            d.id === draftId ? { ...d, caption: data.translated } : d
          )
        );
        toast.success(`Translated to ${translateLang}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Translation failed");
      } finally {
        setTranslating(null);
      }
    },
    [drafts, translateLang, payload.platform]
  );

  const handleBrandCheck = useCallback(
    async (content: string) => {
      setBrandChecking(true);
      setBrandCheck(null);
      try {
        const res = await fetch("/api/brand/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: content, platform: payload.platform }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Brand check failed");
        setBrandCheck(data.result);
        toast.success(`Brand score: ${data.result.score.overallScore}/100`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Brand check failed");
      } finally {
        setBrandChecking(false);
      }
    },
    [payload.platform]
  );

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
    const campaignId = searchParams.get("campaignId");

    if (platform || pillar || topic || campaignId) {
      setPayload((current) => ({
        ...current,
        ...(platform && PLATFORMS.includes(platform as (typeof PLATFORMS)[number]) && { platform: platform as (typeof PLATFORMS)[number] }),
        ...(pillar && { pillar }),
        ...(topic && { topic }),
        ...(campaignId && { campaignId }),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        if (res.ok && Array.isArray(data.campaigns)) {
          setCampaignOptions(
            data.campaigns.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // optional
      }
    }
    void loadCampaigns();
  }, []);

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
      const { campaignId, ...rest } = payload;
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          ...(campaignId ? { campaignId } : {}),
        }),
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

  const pk = PLATFORM_KNOWLEDGE[payload.platform as Platform];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Content</h1>
          <p className="text-muted-foreground">
            Pick platform + pillar, then generate draft variants side-by-side.
          </p>
        </div>
        <ExportDraftsButton />
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
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="gen-platform"
              label="Platform"
              hint={GENERATION_HINTS.platform}
            />
            <select
              id="gen-platform"
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
            {PLATFORM_MEDIA_SUPPORT[payload.platform] && (
              <div className="mt-1.5 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_MEDIA_SUPPORT[payload.platform].formats.map((f) => (
                    <span key={f} className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border">
                      {f}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {PLATFORM_MEDIA_SUPPORT[payload.platform].maxDuration && (
                    <span className="font-medium">Max: {PLATFORM_MEDIA_SUPPORT[payload.platform].maxDuration} · </span>
                  )}
                  {PLATFORM_MEDIA_SUPPORT[payload.platform].notes}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm md:col-span-2">
            <FieldLabelWithHint
              htmlFor="gen-campaign"
              label="Campaign (optional)"
              hint={GENERATION_HINTS.campaign}
            />
            <select
              id="gen-campaign"
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={payload.campaignId ?? ""}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  campaignId: event.target.value || undefined,
                }))
              }
            >
              <option value="">None</option>
              {campaignOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Create campaigns under{" "}
              <a className="text-primary underline" href="/content/campaigns">
                Content → Campaigns
              </a>
              .
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint htmlFor="gen-pillar" label="Pillar" hint={GENERATION_HINTS.pillar} />
              <FieldCharCounter current={payload.pillar.length} max={120} />
            </div>
            <Input
              id="gen-pillar"
              value={payload.pillar}
              onChange={(event) =>
                setPayload((current) => ({ ...current, pillar: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 text-sm md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint htmlFor="gen-topic" label="Topic" hint={GENERATION_HINTS.topic} />
              <FieldCharCounter current={payload.topic.length} max={200} />
            </div>
            <Input
              id="gen-topic"
              value={payload.topic}
              onChange={(event) =>
                setPayload((current) => ({ ...current, topic: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor="gen-objective"
                label="Objective"
                hint={GENERATION_HINTS.objective}
              />
              <FieldCharCounter current={payload.objective.length} max={80} />
            </div>
            <Input
              id="gen-objective"
              value={payload.objective}
              onChange={(event) =>
                setPayload((current) => ({ ...current, objective: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor="gen-audience"
                label="Audience"
                hint={GENERATION_HINTS.audience}
              />
              <FieldCharCounter current={payload.audience.length} max={200} />
            </div>
            <Input
              id="gen-audience"
              value={payload.audience}
              onChange={(event) =>
                setPayload((current) => ({ ...current, audience: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint htmlFor="gen-voice" label="Voice" hint={GENERATION_HINTS.voice} />
              <FieldCharCounter current={payload.voice.length} max={120} />
            </div>
            <Input
              id="gen-voice"
              value={payload.voice}
              onChange={(event) =>
                setPayload((current) => ({ ...current, voice: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint htmlFor="gen-cta" label="CTA" hint={GENERATION_HINTS.cta} />
              <FieldCharCounter current={payload.cta.length} max={280} />
            </div>
            <Input
              id="gen-cta"
              value={payload.cta}
              onChange={(event) =>
                setPayload((current) => ({ ...current, cta: event.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              id="gen-variants"
              type="checkbox"
              className="size-4 shrink-0"
              checked={payload.generateVariants}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  generateVariants: event.target.checked,
                }))
              }
            />
            <FieldLabelWithHint
              htmlFor="gen-variants"
              label="Generate A/B/C variants"
              hint={GENERATION_HINTS.variants}
            />
          </div>

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
            {loading && (
              <div className="mt-3 space-y-2">
                <Progress
                  value={
                    generatingVariant === "visual"
                      ? 85
                      : generatingVariant === "C"
                        ? 66
                        : generatingVariant === "B"
                          ? 44
                          : generatingVariant === "A"
                            ? 22
                            : 10
                  }
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {generatingVariant === "visual"
                    ? "Designing visuals and carousel layouts…"
                    : generatingVariant
                      ? `Writing variant ${generatingVariant} copy…`
                      : "Preparing generation pipeline…"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {grouped.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold leading-snug">
                  {payload.topic.trim() || payload.pillar || "Generated drafts"}
                </CardTitle>
                <CardDescription>
                  {payload.pillar}
                  {payload.pillar ? " · " : ""}
                  {PLATFORM_LABELS[payload.platform]}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="translate-lang" className="text-xs text-muted-foreground whitespace-nowrap">
                  Translate to:
                </label>
                <select
                  id="translate-lang"
                  className="h-7 rounded border bg-transparent px-2 text-xs"
                  value={translateLang}
                  onChange={(e) => setTranslateLang(e.target.value)}
                >
                  {TRANSLATE_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={translating === draft.id}
                        onClick={() => void handleTranslate(draft.id)}
                        className="shrink-0 rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        title={`Translate to ${translateLang}`}
                      >
                        {translating === draft.id ? "Translating..." : "Translate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(draft.id)}
                        className="shrink-0 rounded border px-2 py-1 text-xs"
                      >
                        Edit visuals
                      </button>
                    </div>
                  </div>
                  {draft.writerRationale && (
                    <div className="mb-2">
                      <ContentExplainerPanel
                        title="Why this hook / angle (writer)"
                        body={draft.writerRationale}
                      />
                    </div>
                  )}
                  {draft.visualPlanData?.designRationale && (
                    <div className="mb-2">
                      <ContentExplainerPanel
                        title="Why this visual angle (designer)"
                        body={draft.visualPlanData.designRationale}
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 whitespace-pre-wrap text-sm">{draft.caption}</p>
                    <FieldCharCounter current={draft.caption.length} max={pk.charLimit} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                    <p className="flex-1 text-muted-foreground text-xs">{draft.hashtags.join(" ")}</p>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <FieldCharCounter
                        label="Tags"
                        current={draft.hashtags.length}
                        max={pk.hashtagLimits.max > 0 ? pk.hashtagLimits.max : null}
                      />
                      <FieldCharCounter
                        label="Hashtag text"
                        current={draft.hashtags.join(" ").length}
                        max={null}
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">CTA: {draft.cta}</p>
                    <FieldCharCounter current={draft.cta.length} max={280} />
                  </div>
                  {draft.mediaUrls.length > 0 && (
                    <div className="mt-3">
                      <DraftMediaGallery
                        key={draft.mediaUrls.join("|")}
                        urls={draft.mediaUrls}
                        verticalShortForm={
                          payload.platform === "instagram" && draft.mediaType === "video"
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Consistency Check */}
      {grouped.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Brand Consistency Check</CardTitle>
              <button
                type="button"
                disabled={brandChecking || !selectedId}
                onClick={() => {
                  const draft = drafts.find((d) => d.id === selectedId);
                  if (draft) void handleBrandCheck(draft.caption);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {brandChecking ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Checking...
                  </>
                ) : (
                  "Check selected draft"
                )}
              </button>
            </div>
            <CardDescription>
              Verify your generated content against your brand guidelines before submitting.
            </CardDescription>
          </CardHeader>
{brandCheck ? (
            <CardContent>
              <OnBrandScoreCard
                score={brandCheck.score}
                summary={brandCheck.summary}
                issues={brandCheck.issues}
                strengths={brandCheck.strengths}
              />
            </CardContent>
          ) : null}
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
