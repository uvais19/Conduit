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

const LINKEDIN_WRITER_ADDENDUM = [
  "LINKEDIN TEXT-FIRST RULES (critical):",
  "- The first 1–2 lines appear before “see more” — put the entire hook there; no filler.",
  "- Optimize for dwell time: short paragraphs (1–2 sentences), generous line breaks, scannable structure.",
  "- Do NOT put URLs in the post body; if a link is implied, say “link in comments” or similar.",
  "- End with 3–5 professional hashtags on their own line at the bottom (within platform limits).",
  "- Tone: authoritative, helpful, zero fluff — thought leadership for the stated audience.",
  "- Encourage comments: end with a sharp question or clear invitation to disagree/share experience.",
  "- Variants A/B/C must feel meaningfully different in structure and hook while covering the same topic.",
].join("\n");

export async function runPlatformWriterAgent(
  input: ContentGenerationRequest,
  variantLabel: VariantLabel,
  options?: { strategyContext?: string | null }
): Promise<GeneratedVariant> {
  const strategyContext = options?.strategyContext?.trim();
  const platformContext = getPlatformPromptContext(input.platform);
  const pk = PLATFORM_KNOWLEDGE[input.platform];
  const linkedinExtra =
    input.platform === "linkedin"
      ? `\n\n${LINKEDIN_WRITER_ADDENDUM}\n`
      : "";

  const result = await generateJson<{
    caption: string;
    hashtags: string[];
    cta: string;
    rationale?: string;
  }>({
    systemPrompt: [
      `You are a ${input.platform} content writing specialist for Conduit, an AI social media manager.`,
      `Write content that is native to ${input.platform} and follows its specific rules and best practices.`,
      input.platform === "linkedin"
        ? "LinkedIn rewards native text, strong hooks, and comment conversation — visuals are secondary to the written post."
        : "",
      "",
      platformContext,
      linkedinExtra,
      "",
      'Return valid JSON only with: { "caption", "hashtags", "cta", "rationale" }',
      '"rationale": 2–4 sentences explaining the hook/angle choice for this variant and platform.',
    ]
      .filter(Boolean)
      .join("\n"),
    userPrompt: [
      `Write a ${input.platform} post with a ${VARIANT_ANGLES[variantLabel]} angle.`,
      "",
      `Topic: ${input.topic}`,
      `Content pillar: ${input.pillar}`,
      `Target audience: ${input.audience}`,
      `Objective: ${input.objective}`,
      `Brand voice: ${input.voice}`,
      `CTA direction: ${input.cta}`,
      ...(strategyContext
        ? [
            "",
            "── Strategy-aligned guardrails (honor pillar intent, themes, and goals) ──",
            strategyContext,
          ]
        : []),
      "",
      "Requirements:",
      `- Stay within ${pk.charLimit} characters`,
      `- Include ${pk.hashtagLimits.min}-${pk.hashtagLimits.max} hashtags (0 if platform doesn't use them)`,
      `- Follow the platform content rules above exactly`,
      `- Match the brand voice while adapting to the platform tone`,
      `- The CTA should feel natural to ${input.platform}`,
      input.platform === "linkedin"
        ? "- Caption must be structured for LinkedIn feed: hook → insight/bullets or short sections → CTA/question → hashtags."
        : "",
      "",
      'Return JSON: { "caption": "...", "hashtags": ["#tag1", ...], "cta": "...", "rationale": "..." }',
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.45,
    fallback: null as unknown as {
      caption: string;
      hashtags: string[];
      cta: string;
      rationale?: string;
    },
  });

  if (!result || !result.caption) {
    throw new Error(`Content generation failed for ${input.platform} variant ${variantLabel}`);
  }

  return {
    variantLabel,
    caption: result.caption,
    hashtags: result.hashtags ?? [],
    cta: result.cta ?? input.cta,
    writerRationale: result.rationale?.trim() || undefined,
  };
}

export async function generatePlatformVariants(
  input: ContentGenerationRequest,
  options?: { strategyContext?: string | null }
): Promise<{
  variantGroup: string;
  variants: GeneratedVariant[];
}> {
  const labels: VariantLabel[] = input.generateVariants ? ["A", "B", "C"] : ["A"];
  const variants = await Promise.all(
    labels.map((label) => runPlatformWriterAgent(input, label, options))
  );
  return {
    variantGroup: crypto.randomUUID(),
    variants,
  };
}
