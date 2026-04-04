import { randomUUID } from "crypto";
import { generateJson, generateText } from "@/lib/ai/clients";
import {
  PLATFORM_KNOWLEDGE,
  getPlatformPromptContext,
} from "@/lib/agents/platform-knowledge";
import type {
  ContentDraftRecord,
  ContentGenerationRequest,
  VisualPlanPersisted,
} from "@/lib/content/types";
import type { Platform } from "@/lib/types";

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

export type VisualDesignerOutput = {
  plan: VisualPlan;
  visualPlanData: VisualPlanPersisted;
  draftFields: {
    carousel: ContentDraftRecord["carousel"];
    storyTemplate: ContentDraftRecord["storyTemplate"];
    mediaType: ContentDraftRecord["mediaType"];
  };
};

type VisualPlanModelJson = {
  objective: string;
  styleHint: string;
  imagePromptOutline: string;
  slideVisualBriefs?: string[];
  carousel?: Array<{ id?: string; heading: string; body: string }>;
  storyTemplate?: VisualPlan["storyTemplate"];
  recommendedDimensions: { width: number; height: number; aspectRatio: string };
};

export type ImageApiAspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export function normalizeAspectRatio(raw: string): ImageApiAspectRatio {
  const s = raw.trim().toLowerCase().replace(/\s/g, "");
  if (s === "1:1" || s === "1x1") return "1:1";
  if (s === "4:5" || s === "4x5") return "4:5";
  if (s === "9:16" || s === "9x16") return "9:16";
  if (s === "16:9" || s === "16x9") return "16:9";
  if (s.includes("1.91") || s.includes("1200") || s.includes("landscape"))
    return "16:9";
  return "1:1";
}

function buildFallbackModelJson(
  draft: ContentDraftRecord,
  objective: string,
  styleHint: string
): VisualPlanModelJson {
  const pk = PLATFORM_KNOWLEDGE[draft.platform];
  const supportsCarousel = pk.visualFormats.includes("carousel");
  const supportsStory = pk.visualFormats.includes("story");
  const defaultDim = pk.mediaSpecs.dimensions[0];

  return {
    objective,
    styleHint,
    imagePromptOutline: `On-brand ${draft.platform} visual for pillar "${draft.pillar}". ${objective}. Style: ${styleHint}. Caption theme: ${draft.caption.slice(0, 200)}.`,
    slideVisualBriefs: supportsCarousel
      ? [
          `Slide 1 — Hook: visual that stops the scroll; echo: ${draft.caption.slice(0, 80)}`,
          `Slide 2 — Value: clarify the insight for ${draft.pillar}`,
          `Slide 3 — CTA: drive action: ${draft.cta}`,
        ]
      : undefined,
    carousel: supportsCarousel
      ? [
          { id: randomUUID(), heading: "The hook", body: draft.caption.slice(0, 120) },
          {
            id: randomUUID(),
            heading: "The insight",
            body: `Why this matters for ${draft.pillar.toLowerCase()}.`,
          },
          { id: randomUUID(), heading: "The action", body: draft.cta },
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

function platformVisualDirectives(platform: Platform, generation?: ContentGenerationRequest): string {
  if (platform === "instagram") {
    return [
      "INSTAGRAM VISUAL RULES:",
      "- Feed posts: prefer 1080×1080 (1:1) or 1080×1350 (4:5). Carousels: each slide same aspect; max 10 slides.",
      "- For image-generation prompts: specify composition for ~1080px on the long edge — sharp enough for feed, avoid pointless 4K detail to save tokens.",
      "- Carousel: output slideVisualBriefs with ONE entry per slide, in order. Each brief must say what must appear on that slide (subject, text overlay rules, color mood).",
      "- Align slide headings/bodies with native IG carousel storytelling (hook → value → proof/CTA).",
      generation
        ? `- Campaign topic: ${generation.topic}. Audience: ${generation.audience}. Voice: ${generation.voice}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (platform === "linkedin") {
    return [
      "LINKEDIN VISUAL RULES:",
      "- Prioritize textual clarity: document-style carousel / thought-leadership slides. Headings = slide titles; body = on-slide copy (concise).",
      "- Native posts favor strong first lines in the caption (already separate); visuals support credibility — charts metaphors, clean typography, minimal decoration.",
      "- Recommended image shapes: 1200×627 (landscape / ~1.91:1) or 1080×1080 for square. Map aspect to 16:9 or 1:1 in recommendedDimensions.aspectRatio field using 16:9 or 1:1.",
      "- Do NOT optimize for Instagram-style lifestyle imagery; keep professional and readable.",
      generation
        ? `- Topic: ${generation.topic}. Audience: ${generation.audience}. Voice: ${generation.voice}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return getPlatformPromptContext(platform);
}

async function expandProductionImagePrompt(params: {
  draft: ContentDraftRecord;
  model: VisualPlanModelJson;
  generationContext?: ContentGenerationRequest;
}): Promise<string> {
  const { draft, model, generationContext } = params;
  const pk = PLATFORM_KNOWLEDGE[draft.platform];
  const slides =
    model.carousel?.map((s, i) => `Slide ${i + 1}: "${s.heading}" — ${s.body}`).join("\n") ??
    "(single image, no carousel)";

  const slideBriefs =
    model.slideVisualBriefs?.map((b, i) => `Slide ${i + 1} art direction: ${b}`).join("\n") ?? "";

  const userPrompt = [
    "Expand the OUTLINE below into a single, exhaustive image-generation brief for a design/AI image model.",
    "Requirements:",
    "- Be specific: subjects, lighting, camera angle, palette, negative space for text, typography style if text on image.",
    "- Include brand-safe guardrails (no logos you invent, no celebrity likenesses).",
    "- Reference the platform dimensions and intent.",
    "",
    `Platform: ${draft.platform}`,
    `Creative objective (visual): ${model.objective}`,
    `Style direction: ${model.styleHint}`,
    `Pillar: ${draft.pillar}`,
    `Caption (context): ${draft.caption}`,
    `Hashtags (mood only): ${draft.hashtags.slice(0, 8).join(" ")}`,
    `CTA: ${draft.cta}`,
    `Recommended frame: ${model.recommendedDimensions.width}×${model.recommendedDimensions.height} (${model.recommendedDimensions.aspectRatio})`,
    "",
    "Carousel / slide copy to support visually:",
    slides,
    "",
    "Per-slide visual briefs (follow closely):",
    slideBriefs || "(n/a)",
    "",
    generationContext
      ? [
          "Campaign context:",
          `Topic: ${generationContext.topic}`,
          `Objective: ${generationContext.objective}`,
          `Audience: ${generationContext.audience}`,
          `Voice: ${generationContext.voice}`,
        ].join("\n")
      : "",
    "",
    "OUTLINE TO EXPAND:",
    model.imagePromptOutline,
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = [
    "You are a principal art director and prompt engineer for social paid/organic creative.",
    "Output plain text only — one continuous image generation brief (no JSON, no markdown fences).",
    "Length: thorough — aim for 400–900 words so nothing critical is missing for image generation.",
    draft.platform === "instagram"
      ? "Stress Instagram-safe framing, legible overlays for small screens, and per-slide variation for carousels."
      : "",
    draft.platform === "linkedin"
      ? "Stress LinkedIn-native professionalism, readability, and text-forward slides over decorative fluff."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const expanded =
    (await generateText({
      systemPrompt,
      userPrompt,
      temperature: 0.35,
    }))?.trim() ?? "";

  if (expanded.length > 120) {
    return expanded;
  }

  return [
    model.imagePromptOutline,
    slideBriefs,
    `Full context: ${draft.caption.slice(0, 400)}`,
    `Dimensions: ${pk.mediaSpecs.dimensions[0].width}×${pk.mediaSpecs.dimensions[0].height}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runVisualDesignerAgent({
  draft,
  objective,
  styleHint,
  generationContext,
}: {
  draft: ContentDraftRecord;
  objective: string;
  styleHint: string;
  generationContext?: ContentGenerationRequest;
}): Promise<VisualDesignerOutput> {
  const pk = PLATFORM_KNOWLEDGE[draft.platform];
  const supportsCarousel = pk.visualFormats.includes("carousel");
  const supportsStory = pk.visualFormats.includes("story");
  const fallbackModel = buildFallbackModelJson(draft, objective, styleHint);

  const inferenceNote = generationContext
    ? [
        "The user just generated this draft variant from a campaign brief. Infer the best VISUAL creative objective and VISUAL style hint for imagery (not the same as the copy objective unless appropriate).",
        `Copy-side objective was: "${generationContext.objective}" — translate into visual goals (e.g. saves, shares, brand recall).`,
        `Brand voice for style: ${generationContext.voice}`,
      ].join("\n")
    : [
        "Refine the provided objective and styleHint for visual production (slightly more specific), or keep them if already strong.",
        `Provided objective: "${objective}"`,
        `Provided style hint: "${styleHint}"`,
      ].join("\n");

  const visualInstructions: string[] = [
    "Return strict JSON only matching the schema shape given.",
    inferenceNote,
    platformVisualDirectives(draft.platform, generationContext),
  ];
  if (supportsCarousel) {
    visualInstructions.push(
      "Include a carousel with 3–5 slides (Instagram: storytelling; LinkedIn: text-forward document slides)."
    );
    visualInstructions.push(
      "slideVisualBriefs MUST have the same length as carousel slides, in the same order."
    );
  } else {
    visualInstructions.push("Set carousel to [] and omit slideVisualBriefs or use empty array.");
  }
  if (supportsStory) {
    visualInstructions.push("Include one storyTemplate for vertical story placements.");
  } else {
    visualInstructions.push("Set storyTemplate to null.");
  }
  if (!supportsCarousel && !supportsStory) {
    visualInstructions.push("Only imagePromptOutline + recommendedDimensions; carousel empty; storyTemplate null.");
  }

  const generated = await generateJson<VisualPlanModelJson>({
    systemPrompt: [
      "You are the Visual Designer Agent for Conduit. Output practical visual plans as JSON.",
      "Only include carousel/story when the platform supports them.",
      "imagePromptOutline is a short structured outline (bullets ok); a separate step will expand it — still make it concrete.",
    ].join(" "),
    userPrompt: [
      visualInstructions.join("\n"),
      "",
      `Platform: ${draft.platform}`,
      `Pillar: ${draft.pillar}`,
      `Caption: ${draft.caption}`,
      `CTA: ${draft.cta}`,
      "",
      getPlatformPromptContext(draft.platform),
      "",
      "JSON shape to follow (types and structure):",
      JSON.stringify(fallbackModel, null, 2),
    ].join("\n\n"),
    temperature: 0.35,
    fallback: fallbackModel,
  });

  const merged: VisualPlanModelJson = {
    ...fallbackModel,
    ...generated,
    recommendedDimensions:
      generated.recommendedDimensions ?? fallbackModel.recommendedDimensions,
  };

  if (!merged.objective?.trim()) merged.objective = fallbackModel.objective;
  if (!merged.styleHint?.trim()) merged.styleHint = fallbackModel.styleHint;
  if (!merged.imagePromptOutline?.trim()) {
    merged.imagePromptOutline = fallbackModel.imagePromptOutline;
  }

  const rawCarousel = supportsCarousel
    ? (merged.carousel?.length ? merged.carousel : fallbackModel.carousel) ?? []
    : [];

  const carousel: ContentDraftRecord["carousel"] = rawCarousel.map((slide) => ({
    id: slide.id?.trim() ? slide.id : randomUUID(),
    heading: slide.heading,
    body: slide.body,
  }));

  let slideBriefs = merged.slideVisualBriefs;
  if (supportsCarousel && carousel.length > 0) {
    if (!slideBriefs?.length) {
      slideBriefs = carousel.map(
        (s, i) =>
          `Slide ${i + 1}: emphasize "${s.heading}" — ${s.body.slice(0, 160)}`
      );
    } else if (slideBriefs.length !== carousel.length) {
      slideBriefs = carousel.map(
        (s, i) =>
          slideBriefs![i] ??
          `Slide ${i + 1}: emphasize "${s.heading}" — ${s.body.slice(0, 160)}`
      );
    }
  } else {
    slideBriefs = undefined;
  }

  const storyTemplate = supportsStory
    ? merged.storyTemplate ?? fallbackModel.storyTemplate
    : undefined;

  const modelForExpand: VisualPlanModelJson = {
    ...merged,
    carousel: supportsCarousel ? carousel : undefined,
    slideVisualBriefs: slideBriefs,
    storyTemplate,
  };

  const detailedImagePrompt = await expandProductionImagePrompt({
    draft,
    model: modelForExpand,
    generationContext,
  });

  const aspectRatio = normalizeAspectRatio(modelForExpand.recommendedDimensions.aspectRatio);

  const resolutionNote =
    draft.platform === "instagram"
      ? "Use 1080px on the long edge per slide for feed carousels — sufficient quality, avoids wasteful 4K specification in prompts."
      : draft.platform === "linkedin"
        ? "Favor crisp typography and 1200px-class width for landscape cards; keep prompts text-centric."
        : undefined;

  const visualPlanData: VisualPlanPersisted = {
    objective: merged.objective.trim(),
    styleHint: merged.styleHint.trim(),
    imagePrompt: detailedImagePrompt,
    slideImagePrompts: slideBriefs,
    recommendedAspectRatio: aspectRatio,
    recommendedResolutionNote: resolutionNote,
  };

  const plan: VisualPlan = {
    imagePrompt: detailedImagePrompt,
    carousel: supportsCarousel ? carousel : undefined,
    storyTemplate,
    recommendedDimensions: modelForExpand.recommendedDimensions,
  };

  const mediaType: ContentDraftRecord["mediaType"] = supportsCarousel && carousel.length > 0
    ? "carousel"
    : storyTemplate
      ? "story"
      : "image";

  return {
    plan,
    visualPlanData,
    draftFields: {
      carousel: supportsCarousel ? carousel : [],
      storyTemplate: storyTemplate ?? null,
      mediaType,
    },
  };
}
