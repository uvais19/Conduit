import { randomUUID } from "crypto";
import { generateJson } from "@/lib/ai/clients";
import type { ContentDraftRecord } from "@/lib/content/types";

export type VisualPlan = {
  imagePrompt: string;
  carousel: Array<{
    id: string;
    heading: string;
    body: string;
    imageUrl?: string;
  }>;
  storyTemplate: {
    template: "bold-offer" | "minimal-quote" | "countdown-launch";
    headline: string;
    subheadline?: string;
    ctaText?: string;
    backgroundUrl?: string;
  };
};

function buildFallbackVisualPlan(
  draft: ContentDraftRecord,
  objective: string,
  styleHint: string
): VisualPlan {
  return {
    imagePrompt: [
      `Design an on-brand social media visual for ${draft.platform}.`,
      `Pillar: ${draft.pillar}.`,
      `Objective: ${objective}.`,
      `Style: ${styleHint}.`,
      `Caption intent: ${draft.caption.slice(0, 260)}.`,
      "Deliver a clean, high-contrast composition with room for text overlay.",
    ].join(" "),
    carousel: [
      {
        id: randomUUID(),
        heading: "The hook",
        body: draft.caption.slice(0, 120),
      },
      {
        id: randomUUID(),
        heading: "The insight",
        body: `Why this matters for ${draft.pillar.toLowerCase()}.`,
      },
      {
        id: randomUUID(),
        heading: "The action",
        body: draft.cta,
      },
    ],
    storyTemplate: {
      template: "bold-offer",
      headline: draft.pillar,
      subheadline: draft.caption.slice(0, 80),
      ctaText: draft.cta,
    },
  };
}

export async function runVisualDesignerAgent({
  draft,
  objective,
  styleHint,
}: {
  draft: ContentDraftRecord;
  objective: string;
  styleHint: string;
}): Promise<VisualPlan> {
  const fallback = buildFallbackVisualPlan(draft, objective, styleHint);

  const generated = await generateJson<VisualPlan>({
    systemPrompt:
      "You are the Visual Designer Agent for Conduit. Produce practical visual plans for social content. Return strict JSON only.",
    userPrompt: [
      "Create an image prompt, a 3-slide carousel draft, and one story template.",
      `Platform: ${draft.platform}`,
      `Pillar: ${draft.pillar}`,
      `Caption: ${draft.caption}`,
      `CTA: ${draft.cta}`,
      `Objective: ${objective}`,
      `Style hint: ${styleHint}`,
      "Use this JSON shape:",
      JSON.stringify(fallback, null, 2),
    ].join("\n\n"),
    temperature: 0.4,
    fallback,
  });

  return {
    imagePrompt: generated.imagePrompt || fallback.imagePrompt,
    carousel:
      generated.carousel?.length && generated.carousel.length > 0
        ? generated.carousel.map((slide) => ({
            id: slide.id || randomUUID(),
            heading: slide.heading,
            body: slide.body,
            imageUrl: slide.imageUrl,
          }))
        : fallback.carousel,
    storyTemplate: generated.storyTemplate || fallback.storyTemplate,
  };
}
