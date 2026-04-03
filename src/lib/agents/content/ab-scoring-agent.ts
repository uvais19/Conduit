import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord, VariantLabel } from "@/lib/content/types";
import type { BrandManifesto, Platform } from "@/lib/types";

type VariantScore = {
  engagementRate: number;
  strengthSignal: string;
  strengthValue: number;
  overallScore: number;
};

type ABScoreResult = {
  winner: VariantLabel;
  scores: Record<string, VariantScore>;
  insights: string[];
  learnedPreference: {
    platform: Platform;
    winningAngle: string;
    margin: number;
  };
};

export async function runABScoringAgent(params: {
  variants: Array<ContentDraftRecord & { analytics?: Record<string, number> }>;
  platform: Platform;
  manifesto: BrandManifesto;
}): Promise<ABScoreResult> {
  const { variants, platform, manifesto } = params;
  const platformContext = getPlatformPromptContext(platform);
  const pk = PLATFORM_KNOWLEDGE[platform];

  const variantDetails = variants.map((v) => ({
    label: v.variantLabel,
    caption: v.caption,
    hashtags: v.hashtags,
    cta: v.cta,
    analytics: v.analytics ?? {},
  }));

  const result = await generateJson<ABScoreResult>({
    systemPrompt: [
      `You are an A/B test scoring specialist for ${platform}.`,
      "Analyze variant performance using platform-specific metrics to determine the winner.",
      "",
      platformContext,
      "",
      `Primary strength signal for ${platform}: ${Object.keys(pk.metricsWeight)[0] ?? "engagementRate"}`,
    ].join("\n"),
    userPrompt: [
      "## Variants to score:",
      JSON.stringify(variantDetails, null, 2),
      "",
      "## Brand context:",
      JSON.stringify({
        voiceAttributes: manifesto.voiceAttributes,
        toneSpectrum: manifesto.toneSpectrum,
      }),
      "",
      "Score each variant (0-100) based on:",
      "1. Actual analytics data (if provided)",
      "2. Content quality and platform-specific best practices",
      "3. Brand voice alignment",
      "4. CTA effectiveness",
      "",
      "Determine the winning angle (educational, story-driven, or results-first) and the margin of victory.",
      "",
      'Return JSON: { "winner": "A"|"B"|"C", "scores": { "A": { "engagementRate": N, "strengthSignal": "...", "strengthValue": N, "overallScore": N }, ... }, "insights": ["..."], "learnedPreference": { "platform": "...", "winningAngle": "...", "margin": N } }',
    ].join("\n"),
    temperature: 0.2,
    fallback: {
      winner: "A" as VariantLabel,
      scores: {
        A: { engagementRate: 0, strengthSignal: "unknown", strengthValue: 0, overallScore: 50 },
      },
      insights: ["Unable to score variants automatically."],
      learnedPreference: {
        platform,
        winningAngle: "educational",
        margin: 0,
      },
    },
  });

  return result;
}
