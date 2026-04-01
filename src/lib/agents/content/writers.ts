import { randomUUID } from "crypto";
import { PLATFORM_CHAR_LIMITS } from "@/lib/constants";
import type { Platform } from "@/lib/types";
import {
  suggestHashtags,
} from "@/lib/content/hashtags";
import type {
  ContentGenerationRequest,
  GeneratedVariant,
  VariantLabel,
} from "@/lib/content/types";

function truncateForPlatform(platform: Platform, text: string): string {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}

function styleForPlatform(platform: Platform): {
  opener: string;
  body: string;
  structure: "paragraph" | "thread";
} {
  switch (platform) {
    case "linkedin":
      return {
        opener: "A practical insight for leaders:",
        body: "Use a concise story + takeaway format.",
        structure: "paragraph",
      };
    case "instagram":
      return {
        opener: "Save this for later:",
        body: "Lead with a hook and a skimmable mini-story.",
        structure: "paragraph",
      };
    case "facebook":
      return {
        opener: "Quick community question:",
        body: "Keep it conversational and invite comments.",
        structure: "paragraph",
      };
    case "x":
      return {
        opener: "Hot take:",
        body: "Keep it crisp and provocative but useful.",
        structure: "thread",
      };
    case "gbp":
      return {
        opener: "Business update:",
        body: "Keep it clear, local, and action-oriented.",
        structure: "paragraph",
      };
  }
}

function buildCaption(
  input: ContentGenerationRequest,
  variantLabel: VariantLabel
): string {
  const style = styleForPlatform(input.platform);
  const nuanceByVariant: Record<VariantLabel, string> = {
    A: "educational",
    B: "story-driven",
    C: "results-first",
  };

  const base = `${style.opener}\n${input.topic} (${nuanceByVariant[variantLabel]} angle).\nPillar: ${input.pillar}.\nAudience: ${input.audience}.\nObjective: ${input.objective}.\n${style.body}`;

  if (input.platform === "x") {
    return truncateForPlatform(
      input.platform,
      `${style.opener} ${input.topic} | ${nuanceByVariant[variantLabel]} | ${input.cta}`
    );
  }

  return truncateForPlatform(input.platform, `${base}\n\n${input.cta}`);
}

export function runPlatformWriterAgent(
  input: ContentGenerationRequest,
  variantLabel: VariantLabel
): GeneratedVariant {
  const hashtags = suggestHashtags({
    platform: input.platform,
    pillar: input.pillar,
    topic: input.topic,
    objective: input.objective,
  });

  const cta =
    variantLabel === "A"
      ? input.cta
      : variantLabel === "B"
        ? `${input.cta} and share your take.`
        : `${input.cta} to get the full playbook.`;

  return {
    variantLabel,
    caption: buildCaption(input, variantLabel),
    hashtags,
    cta,
  };
}

export function generatePlatformVariants(input: ContentGenerationRequest): {
  variantGroup: string;
  variants: GeneratedVariant[];
} {
  const labels: VariantLabel[] = input.generateVariants ? ["A", "B", "C"] : ["A"];

  return {
    variantGroup: randomUUID(),
    variants: labels.map((label) => runPlatformWriterAgent(input, label)),
  };
}
