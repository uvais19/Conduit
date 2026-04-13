"use client";

import { useEffect, useState } from "react";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DraftMediaGallery } from "@/components/draft-media-gallery";
import { InstagramCarouselPreview } from "@/components/instagram-carousel-preview";
import { FieldCharCounter } from "@/components/field-char-counter";
import { ContentExplainerPanel } from "@/components/content-explainer-panel";
import type { ContentDraftRecord } from "@/lib/content/types";

type Props = {
  draft: ContentDraftRecord;
  onDraftChange: (nextDraft: ContentDraftRecord) => void;
};

const VISUAL_HINTS = {
  objective:
    "What the visual should optimize for — e.g. engagement, education, or conversion. Steers layout and emphasis in the visual plan.",
  styleHint:
    "Art direction short notes — palette, mood, typography feel. Passed to the designer agent with your brand context.",
  imagePrompt:
    "Instructions for the image model: subject, setting, and constraints. Edit after “Generate Visual Plan” to refine results.",
  upload:
    "Replace or add a slide image from your device. Accepted formats follow the browser’s image/* picker (typically PNG, JPEG, WebP).",
  carouselHeading: "Short title text for this carousel card — often bold in the preview.",
  carouselBody: "Supporting copy for this slide; keep scannable for mobile viewers.",
  storyTemplate:
    "Layout preset for Instagram Stories — controls structure of headline, subhead, and CTA blocks.",
  storyHeadline: "Primary story text; largest type in most templates.",
  storySubheadline: "Secondary line for context, offer detail, or social proof.",
  storyCta: "Button or sticker text that tells viewers what to do next (e.g. Swipe up, Link in bio).",
} as const;

export function DraftVisualEditor({ draft, onDraftChange }: Props) {
  const [objective, setObjective] = useState("engagement");
  const [styleHint, setStyleHint] = useState("clean and modern");
  const [imagePrompt, setImagePrompt] = useState(
    `On-brand visual for ${draft.pillar} about ${draft.caption.slice(0, 60)}`
  );
  const [busy, setBusy] = useState<"none" | "plan" | "generate" | "upload">("none");
  const [error, setError] = useState("");

  const visualKey = draft.visualPlanData
    ? `${draft.visualPlanData.objective}|${draft.visualPlanData.styleHint}|${draft.visualPlanData.imagePrompt.slice(0, 120)}`
    : "";

  useEffect(() => {
    const v = draft.visualPlanData;
    if (v) {
      setObjective(v.objective);
      setStyleHint(v.styleHint);
      setImagePrompt(v.imagePrompt);
    }
    // visualKey encodes server-side visual plan updates after variant generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id, visualKey]);

  async function buildVisualPlan() {
    setBusy("plan");
    setError("");

    try {
      const response = await fetch(`/api/drafts/${draft.id}/visual-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          objective,
          styleHint,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create visual plan");
      }

      if (data.plan?.imagePrompt) {
        setImagePrompt(data.plan.imagePrompt as string);
      }
      if (data.draft) {
        onDraftChange(data.draft as ContentDraftRecord);
      }
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "Failed to create plan");
    } finally {
      setBusy("none");
    }
  }

  async function generateImage() {
    setBusy("generate");
    setError("");

    try {
      const response = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          prompt: imagePrompt,
          aspectRatio: draft.visualPlanData?.recommendedAspectRatio ?? "1:1",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.draft) {
        onDraftChange(data.draft as ContentDraftRecord);
      }
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate image"
      );
    } finally {
      setBusy("none");
    }
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy("upload");
    setError("");

    try {
      const body = new FormData();
      body.append("draftId", draft.id);
      body.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      if (data.draft) {
        onDraftChange(data.draft as ContentDraftRecord);
      }
      event.target.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
    } finally {
      setBusy("none");
    }
  }

  function patchCarousel(index: number, patch: { heading?: string; body?: string }) {
    const next = draft.carousel.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, ...patch } : slide
    );
    onDraftChange({ ...draft, carousel: next, mediaType: "carousel" });
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.carousel.length) return;
    const next = [...draft.carousel];
    const current = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = current;
    onDraftChange({ ...draft, carousel: next, mediaType: "carousel" });
  }

  function addSlide() {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    onDraftChange({
      ...draft,
      mediaType: "carousel",
      carousel: [
        ...draft.carousel,
        {
          id,
          heading: "New slide",
          body: "Add supporting copy",
        },
      ],
    });
  }

  function removeSlide(index: number) {
    const next = draft.carousel.filter((_slide, slideIndex) => slideIndex !== index);
    onDraftChange({ ...draft, carousel: next, mediaType: "carousel" });
  }

  function patchStory(
    patch: Partial<NonNullable<ContentDraftRecord["storyTemplate"]>>
  ) {
    const current =
      draft.storyTemplate ??
      ({
        template: "bold-offer",
        headline: draft.pillar,
        subheadline: draft.caption.slice(0, 80),
        ctaText: draft.cta,
      } as NonNullable<ContentDraftRecord["storyTemplate"]>);

    onDraftChange({
      ...draft,
      mediaType: "story",
      storyTemplate: {
        ...current,
        ...patch,
      },
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Designer Agent</CardTitle>
          <p className="text-sm text-muted-foreground">
            Objective, style, carousel, and image prompt are filled automatically when you generate
            variants. Use “Generate Visual Plan” to refresh from the latest caption and carousel.
          </p>
          {draft.visualPlanData?.designRationale && (
            <div className="pt-2">
              <ContentExplainerPanel
                title="Why this visual plan"
                body={draft.visualPlanData.designRationale}
                defaultOpen
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor={`${draft.id}-visual-objective`}
              label="Objective"
              hint={VISUAL_HINTS.objective}
            />
            <Input
              id={`${draft.id}-visual-objective`}
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
            />
          </div>
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor={`${draft.id}-visual-style`}
              label="Style hint"
              hint={VISUAL_HINTS.styleHint}
            />
            <Input
              id={`${draft.id}-visual-style`}
              value={styleHint}
              onChange={(event) => setStyleHint(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={busy !== "none"}
              onClick={buildVisualPlan}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === "plan" ? "Designing..." : "Generate Visual Plan"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Image Generation + Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor={`${draft.id}-image-prompt`}
                label="Image prompt"
                hint={VISUAL_HINTS.imagePrompt}
              />
              <FieldCharCounter current={imagePrompt.length} max={4000} />
            </div>
            <textarea
              id={`${draft.id}-image-prompt`}
              className="min-h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
              value={imagePrompt}
              onChange={(event) => setImagePrompt(event.target.value)}
            />
          </div>

          {draft.visualPlanData?.recommendedResolutionNote && (
            <p className="text-xs text-muted-foreground">
              {draft.visualPlanData.recommendedResolutionNote} Suggested aspect:{" "}
              {draft.visualPlanData.recommendedAspectRatio ?? "1:1"}.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy !== "none"}
              onClick={generateImage}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === "generate" ? "Generating..." : "Generate Image"}
            </button>
            <div className="flex flex-col gap-2">
              <FieldLabelWithHint
                htmlFor={`${draft.id}-upload-image`}
                label="Upload image or video"
                hint="Images for feed/carousel, or short video files (e.g. MP4, WebM) for Reels-style placements."
              />
              <label
                htmlFor={`${draft.id}-upload-image`}
                className="inline-flex w-fit cursor-pointer items-center rounded-md border px-3 py-2 text-sm"
              >
                Choose file
                <input
                  id={`${draft.id}-upload-image`}
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={uploadImage}
                />
              </label>
            </div>
          </div>

          {draft.mediaUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {draft.mediaUrls.length > 1 ? "Media carousel" : "Media preview"}
              </p>
              <DraftMediaGallery
                key={draft.mediaUrls.join("|")}
                urls={draft.mediaUrls}
                verticalShortForm={
                  draft.mediaType === "video" ||
                  draft.visualPlanData?.recommendedAspectRatio === "9:16"
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carousel Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.carousel.map((slide, index) => (
            <div key={slide.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Slide {index + 1}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveSlide(index, -1)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 1)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlide(index)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabelWithHint
                    htmlFor={`${draft.id}-carousel-${index}-heading`}
                    label="Heading"
                    hint={VISUAL_HINTS.carouselHeading}
                  />
                  <FieldCharCounter current={slide.heading.length} max={200} />
                </div>
                <Input
                  id={`${draft.id}-carousel-${index}-heading`}
                  value={slide.heading}
                  onChange={(event) => patchCarousel(index, { heading: event.target.value })}
                />
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabelWithHint
                    htmlFor={`${draft.id}-carousel-${index}-body`}
                    label="Body"
                    hint={VISUAL_HINTS.carouselBody}
                  />
                  <FieldCharCounter current={slide.body.length} max={2000} />
                </div>
                <textarea
                  id={`${draft.id}-carousel-${index}-body`}
                  className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2"
                  value={slide.body}
                  onChange={(event) => patchCarousel(index, { body: event.target.value })}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSlide}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
          >
            Add slide
          </button>

          <InstagramCarouselPreview draft={draft} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Story Template Editor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor={`${draft.id}-story-template`}
              label="Template"
              hint={VISUAL_HINTS.storyTemplate}
            />
            <select
              id={`${draft.id}-story-template`}
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={draft.storyTemplate?.template ?? "bold-offer"}
              onChange={(event) =>
                patchStory({
                  template: event.target.value as NonNullable<
                    ContentDraftRecord["storyTemplate"]
                  >["template"],
                })
              }
            >
              <option value="bold-offer">Bold offer</option>
              <option value="minimal-quote">Minimal quote</option>
              <option value="countdown-launch">Countdown launch</option>
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor={`${draft.id}-story-headline`}
                label="Headline"
                hint={VISUAL_HINTS.storyHeadline}
              />
              <FieldCharCounter current={(draft.storyTemplate?.headline ?? "").length} max={100} />
            </div>
            <Input
              id={`${draft.id}-story-headline`}
              value={draft.storyTemplate?.headline ?? ""}
              onChange={(event) => patchStory({ headline: event.target.value })}
            />
          </div>

          <div className="space-y-2 text-sm md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor={`${draft.id}-story-subheadline`}
                label="Subheadline"
                hint={VISUAL_HINTS.storySubheadline}
              />
              <FieldCharCounter current={(draft.storyTemplate?.subheadline ?? "").length} max={200} />
            </div>
            <Input
              id={`${draft.id}-story-subheadline`}
              value={draft.storyTemplate?.subheadline ?? ""}
              onChange={(event) => patchStory({ subheadline: event.target.value })}
            />
          </div>

          <div className="space-y-2 text-sm md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabelWithHint
                htmlFor={`${draft.id}-story-cta`}
                label="CTA Text"
                hint={VISUAL_HINTS.storyCta}
              />
              <FieldCharCounter current={(draft.storyTemplate?.ctaText ?? "").length} max={80} />
            </div>
            <Input
              id={`${draft.id}-story-cta`}
              value={draft.storyTemplate?.ctaText ?? ""}
              onChange={(event) => patchStory({ ctaText: event.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
