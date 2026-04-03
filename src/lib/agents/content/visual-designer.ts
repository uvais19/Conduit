import { randomUUID } from "crypto";
import { generateJson } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE, getPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";

export type VisualPlan = {
  imagePrompt: string;
  carousel?: Array<{
    id: string;
    heading: string;
    body: string;
    imageUrl?: string;
  }>;
  storyTemplate?: {
    template: "bold-offer" | "minimal-quote" | "countdown-launch";
    headline: string;
    subheadline?: string;
    ctaText?: string;
    backgroundUrl?: string;
  };
  recommendedDimensions: { width: number; height: number; aspectRatio: string };
};

function buildFallbackVisualPlan(
  draft: ContentDraftRecord,
  objective: string,
  styleHint: string
): VisualPlan {
  const pk = PLATFORM_KNOWLEDGE[draft.platform];
  const supportsCarousel = pk.visualFormats.includes("carousel");
  const supportsStory = pk.visualFormats.includes("story");
  const defaultDim = pk.mediaSpecs.dimensions[0];

  return {
    imagePrompt: [
      `Design an on-brand social media visual for ${draft.platform}.`,
      `Pillar: ${draft.pillar}.`,
      `Objective: ${objective}.`,
      `Style: ${styleHint}.`,
      `Caption intent: ${draft.caption.slice(0, 260)}.`,
      `Recommended dimensions: ${defaultDim.width}x${defaultDim.height} (${defaultDim.aspectRatio}).`,
      "Deliver a clean, high-contrast composition with room for text overlay.",
    ].join(" "),
    carousel: supportsCarousel
      ? [
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
        ]
      : undefined,
    storyTemplate: supportsStory
      ? {
          template: "bold-offer",
          headline: draft.pillar,
          subheadline: draft.caption.slice(0, 80),
          ctaText: draft.cta,
        }
      : undefined,
    recommendedDimensions: {
      width: defaultDim.width,
      height: defaultDim.height,
      aspectRatio: defaultDim.aspectRatio,
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
  const pk = PLATFORM_KNOWLEDGE[draft.platform];
  const supportsCarousel = pk.visualFormats.includes("carousel");
  const supportsStory = pk.visualFormats.includes("story");
  const fallback = buildFallbackVisualPlan(draft, objective, styleHint);

  const visualInstructions: string[] = [
    "Create an image prompt tailored for this platform.",
  ];
  if (supportsCarousel) {
    visualInstructions.push("Include a 3-slide carousel draft.");
  }
  if (supportsStory) {
    visualInstructions.push("Include one story template.");
  }
  if (!supportsCarousel && !supportsStory) {
    visualInstructions.push("This platform does NOT support carousels or stories -- only generate an image prompt.");
  }

  const generated = await generateJson<VisualPlan>({
    systemPrompt: [
      "You are the Visual Designer Agent for Conduit. Produce practical visual plans for social content.",
      "Only include visual formats supported by the target platform.",
      "Return strict JSON only.",
    ].join(" "),
    userPrompt: [
      visualInstructions.join(" "),
      `Platform: ${draft.platform}`,
      `Pillar: ${draft.pillar}`,
      `Caption: ${draft.caption}`,
      `CTA: ${draft.cta}`,
      `Objective: ${objective}`,
      `Style hint: ${styleHint}`,
      "",
      getPlatformPromptContext(draft.platform),
      "",
      "Use this JSON shape:",
      JSON.stringify(fallback, null, 2),
    ].join("\n\n"),
    temperature: 0.4,
    fallback,
  });

  const defaultDim = pk.mediaSpecs.dimensions[0];

  return {
    imagePrompt: generated.imagePrompt || fallback.imagePrompt,
    carousel: supportsCarousel
      ? (generated.carousel?.length && generated.carousel.length > 0
          ? generated.carousel.map((slide) => ({
              id: slide.id || randomUUID(),
              heading: slide.heading,
              body: slide.body,
              imageUrl: slide.imageUrl,
            }))
          : fallback.carousel)
      : undefined,
    storyTemplate: supportsStory
      ? (generated.storyTemplate || fallback.storyTemplate)
      : undefined,
    recommendedDimensions: generated.recommendedDimensions || {
      width: defaultDim.width,
      height: defaultDim.height,
      aspectRatio: defaultDim.aspectRatio,
    },
  };
}
