import type { BrandManifesto } from "@/lib/types";

const MAX_LIST = 8;
const MAX_SECTION = 900;

function take<T>(arr: T[] | undefined, n: number): T[] {
  if (!arr?.length) return [];
  return arr.slice(0, n);
}

function joinLines(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  const body = lines.filter(Boolean).join("\n");
  const block = `${title}\n${body}`;
  return block.length > MAX_SECTION ? `${block.slice(0, MAX_SECTION)}…` : block;
}

/**
 * Bounded text digest of the manifesto for strategy prompts (reduces noise vs raw JSON).
 */
export function buildManifestoStrategyDigest(manifesto: BrandManifesto): string {
  const lines: string[] = [];

  lines.push(
    joinLines("## Business", [
      `Name: ${manifesto.businessName}`,
      manifesto.tagline ? `Tagline: ${manifesto.tagline}` : "",
      `Industry: ${manifesto.industry}`,
      manifesto.subIndustry ? `Sub-industry: ${manifesto.subIndustry}` : "",
      manifesto.missionStatement ? `Mission: ${manifesto.missionStatement}` : "",
      manifesto.vision ? `Vision: ${manifesto.vision}` : "",
      manifesto.coreValues.length
        ? `Core values: ${take(manifesto.coreValues, MAX_LIST).join("; ")}`
        : "",
    ].filter(Boolean))
  );

  lines.push(
    joinLines("## Audience", [
      `Demographics: ${manifesto.primaryAudience.demographics}`,
      `Psychographics: ${manifesto.primaryAudience.psychographics}`,
      manifesto.primaryAudience.painPoints?.length
        ? `Pain points: ${take(manifesto.primaryAudience.painPoints, MAX_LIST).join("; ")}`
        : "",
      manifesto.primaryAudience.desires?.length
        ? `Desires: ${take(manifesto.primaryAudience.desires, MAX_LIST).join("; ")}`
        : "",
    ].filter(Boolean))
  );

  lines.push(
    joinLines("## Offer & differentiation", [
      manifesto.productsServices.length
        ? `Products/services: ${take(manifesto.productsServices, 5)
            .map((p) => `${p.name}${p.description ? ` — ${p.description.slice(0, 120)}` : ""}`)
            .join(" | ")}`
        : "",
      manifesto.uniqueSellingPropositions.length
        ? `USPs: ${take(manifesto.uniqueSellingPropositions, MAX_LIST).join("; ")}`
        : "",
      manifesto.keyMessages.length
        ? `Key messages: ${take(manifesto.keyMessages, MAX_LIST).join("; ")}`
        : "",
    ].filter(Boolean))
  );

  lines.push(
    joinLines("## Voice & guardrails", [
      manifesto.voiceAttributes.length
        ? `Voice: ${take(manifesto.voiceAttributes, MAX_LIST).join("; ")}`
        : "",
      `Tone (formal–playful / technical–emotional): ${manifesto.toneSpectrum.formal}–${manifesto.toneSpectrum.playful}, ${manifesto.toneSpectrum.technical}–${manifesto.toneSpectrum.emotional}`,
      `Language: ${manifesto.languageStyle.sentenceLength} sentences, ${manifesto.languageStyle.vocabulary} vocabulary, ${manifesto.languageStyle.emojiUsage} emoji`,
      manifesto.contentDos.length ? `Do: ${take(manifesto.contentDos, MAX_LIST).join("; ")}` : "",
      manifesto.contentDonts.length ? `Don't: ${take(manifesto.contentDonts, MAX_LIST).join("; ")}` : "",
      manifesto.bannedWords?.length
        ? `Banned words: ${take(manifesto.bannedWords, 20).join(", ")}`
        : "",
      manifesto.requiredDisclosures?.length
        ? `Required disclosures: ${take(manifesto.requiredDisclosures, MAX_LIST).join("; ")}`
        : "",
      manifesto.visualStyle ? `Visual style: ${manifesto.visualStyle.slice(0, 400)}` : "",
    ].filter(Boolean))
  );

  lines.push(
    joinLines("## Social goals", [
      manifesto.socialMediaGoals.length
        ? take(manifesto.socialMediaGoals, MAX_LIST).join("; ")
        : "Not specified",
    ])
  );

  return lines.filter(Boolean).join("\n\n");
}
