import { generateJson } from "@/lib/ai/clients";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import { contentStrategySchema, type BrandManifesto, type ContentStrategy } from "@/lib/types";

export async function runStrategyAgent(
  manifesto: BrandManifesto
): Promise<ContentStrategy> {
  const fallback = createDefaultStrategy(manifesto);

  const generated = await generateJson<ContentStrategy>({
    systemPrompt:
      "You are the Strategy Agent for Conduit, an AI social media manager. Create a practical monthly content strategy grounded in the brand manifesto. Return valid JSON only.",
    userPrompt: [
      "Use this schema shape exactly:",
      JSON.stringify(fallback, null, 2),
      "Brand manifesto:",
      JSON.stringify(manifesto, null, 2),
      "Requirements:",
      "- 3 to 5 content pillars",
      "- platform-specific posting frequency",
      "- 4 weekly themes",
      "- realistic monthly goals",
      "- keep the strategy concrete and useful",
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
