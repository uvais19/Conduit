import { generateJson } from "@/lib/ai/clients";
import {
  createEmptyBrandManifesto,
  textToList,
} from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";
import type {
  DiscoveryInput,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";

function buildFallbackManifesto(
  input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): BrandManifesto {
  const voiceAttributes = textToList(input.brandTone || "")
    .slice(0, 6)
    .map((item) => item.replace(/^[-•]\s*/, ""));

  const offerings = textToList(input.offerings || "");
  const differentiators = textToList(input.differentiators || "");

  return createEmptyBrandManifesto({
    businessName: input.businessName,
    industry: input.industry,
    missionStatement: `Help ${input.targetAudience} succeed through ${offerings[0] || "consistent value"}.`,
    vision: `Become a trusted ${input.industry.toLowerCase()} brand known for clear, reliable communication.`,
    coreValues: ["Clarity", "Consistency", "Customer Focus"],
    productsServices: offerings.length
      ? offerings.map((item) => ({
          name: item,
          description: `${item} for ${input.targetAudience}.`,
          targetAudience: input.targetAudience,
        }))
      : undefined,
    uniqueSellingPropositions: differentiators,
    primaryAudience: {
      demographics: input.targetAudience,
      psychographics:
        input.notes ||
        "They want trusted guidance, helpful communication, and consistent results.",
      painPoints: ["Need more visibility", "Need consistent marketing"],
      desires: ["Growth", "Trust", "Better engagement"],
    },
    voiceAttributes,
    contentDos: textToList(input.contentDos),
    contentDonts: textToList(input.contentDonts),
    socialMediaGoals: textToList(input.goals),
    keyMessages: differentiators.length > 0 ? differentiators : offerings,
    visualStyle: scraper.description || documents.insights[0],
  });
}

export async function runIdentitySynthesizerAgent({
  input,
  scraper,
  documents,
}: {
  input: DiscoveryInput;
  scraper: ScraperResult;
  documents: DocumentAnalysisResult;
}): Promise<BrandManifesto> {
  const fallback = buildFallbackManifesto(input, scraper, documents);

  const generated = await generateJson<Partial<BrandManifesto>>({
    systemPrompt:
      "You are the Identity Synthesizer Agent for Conduit, an AI social media manager. Combine website findings, uploaded documents, and manual business answers into a clean Brand Manifesto. Return valid JSON only.",
    userPrompt: [
      "Use this exact structure and fill every useful field:",
      JSON.stringify(fallback, null, 2),
      "Manual input:",
      JSON.stringify(input, null, 2),
      "Website discovery:",
      JSON.stringify(scraper, null, 2),
      "Document analysis:",
      JSON.stringify(documents, null, 2),
      "Return JSON only. Keep the output practical, grounded, and concise.",
    ].join("\n\n"),
    temperature: 0.3,
    fallback,
  });

  return createEmptyBrandManifesto({
    ...fallback,
    ...generated,
    primaryAudience: {
      ...fallback.primaryAudience,
      ...generated.primaryAudience,
    },
    toneSpectrum: {
      ...fallback.toneSpectrum,
      ...generated.toneSpectrum,
    },
    languageStyle: {
      ...fallback.languageStyle,
      ...generated.languageStyle,
    },
    brandColors: generated.brandColors || fallback.brandColors,
  });
}
