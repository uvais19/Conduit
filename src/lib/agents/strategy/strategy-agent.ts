import { generateJson } from "@/lib/ai/clients";
import { getMultiPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import { contentStrategySchema, type BrandManifesto, type ContentStrategy, type Platform, type PostAnalysis } from "@/lib/types";

export async function runStrategyAgent(
  manifesto: BrandManifesto,
  postAnalyses?: PostAnalysis[],
  platforms?: Platform[],
  competitorInsights?: string | null
): Promise<ContentStrategy> {
  const fallback = createDefaultStrategy(manifesto);

  const analysisSection =
    postAnalyses && postAnalyses.length > 0
      ? [
          "\n\nHistorical posting analysis (use this to ground the strategy in what's already working):",
          JSON.stringify(postAnalyses, null, 2),
          "Incorporate these insights: lean into what works, correct the gaps, maintain what's already aligned.",
        ]
      : [];

  const competitorSection =
    competitorInsights
      ? [
          "",
          "## Competitor Intelligence (differentiate from these):",
          competitorInsights,
          "Use these insights to: find content gaps competitors miss, avoid saturated topics, and identify unique angles.",
        ]
      : [];

  const generated = await generateJson<ContentStrategy>({
    systemPrompt:
      "You are the Strategy Agent for Conduit, an AI social media manager. Create a practical monthly content strategy grounded in the brand manifesto. Return valid JSON only.",
    userPrompt: [
      "Use this schema shape exactly:",
      JSON.stringify(fallback, null, 2),
      "Brand manifesto:",
      JSON.stringify(manifesto, null, 2),
      ...analysisSection,
      "Requirements:",
      "- 3 to 5 content pillars",
      "- platform-specific posting frequency",
      "- 4 weekly themes",
      "- realistic monthly goals",
      "- keep the strategy concrete and useful",
      ...(postAnalyses && postAnalyses.length > 0
        ? ["- incorporate insights from the historical posting analysis above"]
        : []),
      "",
      "Platform-specific guidance (use these when setting schedule, content mix, and weekly theme execution):",
      getMultiPlatformPromptContext(platforms ?? ["instagram", "facebook", "linkedin", "x", "gbp"]),
      "",
      "CRITICAL RULES:",
      "- Each platform's contentMix MUST ONLY include format types that platform supports (see formats above)",
      "- Posting frequency must fall within the platform's posting norms range",
      "- Weekly themes should include platform-specific execution notes",
      "- Image dimensions and media specs must match platform requirements",
      ...competitorSection,
      "Return JSON only.",
    ].join("\n\n"),
    temperature: 0.35,
    fallback,
  });

  try {
    return contentStrategySchema.parse(generated);
  } catch (error) {
    console.error("Strategy Agent returned invalid output, using fallback:", error);
    return fallback;
  }
}
