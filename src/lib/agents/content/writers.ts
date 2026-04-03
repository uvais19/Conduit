import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type {
  ContentGenerationRequest,
  GeneratedVariant,
  VariantLabel,
} from "@/lib/content/types";

const VARIANT_ANGLES: Record<VariantLabel, string> = {
  A: "educational -- lead with a surprising fact, teach something actionable",
  B: "story-driven -- use a narrative arc, relatable scenario, or case study",
  C: "results-first -- lead with outcomes/numbers, then explain the method",
};

export async function runPlatformWriterAgent(
  input: ContentGenerationRequest,
  variantLabel: VariantLabel
): Promise<GeneratedVariant> {
  const platformContext = getPlatformPromptContext(input.platform);
  const pk = PLATFORM_KNOWLEDGE[input.platform];

  const result = await generateJson<{ caption: string; hashtags: string[]; cta: string }>({
    systemPrompt: [
      `You are a ${input.platform} content writing specialist for Conduit, an AI social media manager.`,
      `Write content that is native to ${input.platform} and follows its specific rules and best practices.`,
      "",
      platformContext,
      "",
      "Return valid JSON only with: { caption, hashtags, cta }",
    ].join("\n"),
    userPrompt: [
      `Write a ${input.platform} post with a ${VARIANT_ANGLES[variantLabel]} angle.`,
      "",
      `Topic: ${input.topic}`,
      `Content pillar: ${input.pillar}`,
      `Target audience: ${input.audience}`,
      `Objective: ${input.objective}`,
      `Brand voice: ${input.voice}`,
      `CTA direction: ${input.cta}`,
      "",
      "Requirements:",
      `- Stay within ${pk.charLimit} characters`,
      `- Include ${pk.hashtagLimits.min}-${pk.hashtagLimits.max} hashtags (0 if platform doesn't use them)`,
      `- Follow the platform content rules above exactly`,
      `- Match the brand voice while adapting to the platform tone`,
      `- The CTA should feel natural to ${input.platform}`,
      "",
      'Return JSON: { "caption": "...", "hashtags": ["#tag1", ...], "cta": "..." }',
    ].join("\n"),
    temperature: 0.45,
    fallback: null as unknown as { caption: string; hashtags: string[]; cta: string },
  });

  if (!result || !result.caption) {
    throw new Error(`Content generation failed for ${input.platform} variant ${variantLabel}`);
  }

  return {
    variantLabel,
    caption: result.caption,
    hashtags: result.hashtags ?? [],
    cta: result.cta ?? input.cta,
  };
}

export async function generatePlatformVariants(input: ContentGenerationRequest): Promise<{
  variantGroup: string;
  variants: GeneratedVariant[];
}> {
  const labels: VariantLabel[] = input.generateVariants ? ["A", "B", "C"] : ["A"];
  const variants = await Promise.all(
    labels.map((label) => runPlatformWriterAgent(input, label))
  );
  return {
    variantGroup: crypto.randomUUID(),
    variants,
  };
}
