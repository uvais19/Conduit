import {
  brandManifestoSchema,
  type BrandManifesto,
} from "@/lib/types";

function normalizeList(value: string[] | undefined, fallback: string[]): string[] {
  const cleaned = (value ?? []).map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function textToList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Split only on newlines — use for fields where commas are part of the text (e.g. offerings, differentiators). */
export function textToListByLine(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToText(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

function clampToneAxis(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(10, Math.max(1, Math.round(value)));
}

/**
 * Builds the manifesto record with defaults (same shape as persisted manifesto).
 * Use {@link safeParseBrandManifestoFromPartial} for validation without throwing.
 */
export function buildBrandManifestoCandidate(
  partial: Partial<BrandManifesto> = {}
): BrandManifesto {
  return {
    businessName: partial.businessName?.trim() || "Your Business",
    tagline: partial.tagline?.trim() || undefined,
    industry: partial.industry?.trim() || "General Business",
    subIndustry: partial.subIndustry?.trim() || undefined,
    missionStatement:
      partial.missionStatement?.trim() ||
      "Help our customers succeed with clear, consistent value.",
    vision:
      partial.vision?.trim() ||
      "Build a recognizable brand that earns trust and long-term loyalty.",
    coreValues: normalizeList(partial.coreValues, [
      "Customer focus",
      "Consistency",
      "Integrity",
    ]),
    productsServices:
      partial.productsServices && partial.productsServices.length > 0
        ? partial.productsServices.map((item) => ({
            name: item.name?.trim() || "Primary Offer",
            description: item.description?.trim() || "Describe your main offer.",
            targetAudience: item.targetAudience?.trim() || undefined,
          }))
        : [
            {
              name: "Primary Offer",
              description: "Describe your main offer.",
              targetAudience: undefined,
            },
          ],
    uniqueSellingPropositions: normalizeList(partial.uniqueSellingPropositions, [
      "Clear value proposition",
      "Customer-centric approach",
    ]),
    primaryAudience: {
      demographics:
        partial.primaryAudience?.demographics?.trim() ||
        "Professionals and decision-makers who fit the core customer profile.",
      psychographics:
        partial.primaryAudience?.psychographics?.trim() ||
        "They value trust, clarity, quality, and practical results.",
      painPoints: normalizeList(partial.primaryAudience?.painPoints, [
        "Limited time",
        "Need better outcomes",
      ]),
      desires: normalizeList(partial.primaryAudience?.desires, [
        "Reliable solutions",
        "Business growth",
      ]),
    },
    secondaryAudiences:
      partial.secondaryAudiences
        ?.map((audience) => ({
          demographics: audience.demographics?.trim() || "Secondary audience segment.",
          psychographics: audience.psychographics?.trim() || "They share goals and challenges similar to the primary audience.",
          painPoints: audience.painPoints,
          desires: audience.desires,
        })) ?? [],
    voiceAttributes: normalizeList(partial.voiceAttributes, [
      "Helpful",
      "Confident",
      "Trustworthy",
    ]),
    toneSpectrum: {
      formal: clampToneAxis(partial.toneSpectrum?.formal, 6),
      playful: clampToneAxis(partial.toneSpectrum?.playful, 4),
      technical: clampToneAxis(partial.toneSpectrum?.technical, 5),
      emotional: clampToneAxis(partial.toneSpectrum?.emotional, 5),
      provocative: clampToneAxis(partial.toneSpectrum?.provocative, 3),
    },
    languageStyle: {
      sentenceLength: (["short", "medium", "long", "varied"] as const).includes(partial.languageStyle?.sentenceLength as never)
        ? partial.languageStyle!.sentenceLength
        : "medium",
      vocabulary: (["simple", "professional", "technical", "mixed"] as const).includes(partial.languageStyle?.vocabulary as never)
        ? partial.languageStyle!.vocabulary
        : "professional",
      perspective: (["first-person", "third-person", "mixed"] as const).includes(partial.languageStyle?.perspective as never)
        ? partial.languageStyle!.perspective
        : "mixed",
      emojiUsage: (["none", "minimal", "moderate", "heavy"] as const).includes(partial.languageStyle?.emojiUsage as never)
        ? partial.languageStyle!.emojiUsage
        : "minimal",
    },
    contentDos: normalizeList(partial.contentDos, [
      "Be clear and useful",
      "Stay on brand",
    ]),
    contentDonts: normalizeList(partial.contentDonts, [
      "Avoid hype without substance",
      "Avoid off-brand claims",
    ]),
    bannedWords: partial.bannedWords?.filter(Boolean) ?? [],
    requiredDisclosures: partial.requiredDisclosures?.filter(Boolean) ?? [],
    brandColors: partial.brandColors,
    fontPreferences: partial.fontPreferences?.filter(Boolean) ?? [],
    logoUrl: partial.logoUrl,
    visualStyle: partial.visualStyle?.trim() || "Clean, modern, and consistent.",
    socialMediaGoals: normalizeList(partial.socialMediaGoals, [
      "Grow brand awareness",
      "Increase engagement",
    ]),
    keyMessages: normalizeList(partial.keyMessages, [
      "We deliver clear value",
      "We help customers move forward with confidence",
    ]),
  };
}

export function createEmptyBrandManifesto(
  partial: Partial<BrandManifesto> = {}
): BrandManifesto {
  return brandManifestoSchema.parse(buildBrandManifestoCandidate(partial));
}

export function safeParseBrandManifestoFromPartial(partial: Partial<BrandManifesto> = {}) {
  return brandManifestoSchema.safeParse(buildBrandManifestoCandidate(partial));
}

export type CanonicalVoiceModel = {
  voiceAttributes: string[];
  toneSpectrum: BrandManifesto["toneSpectrum"];
  languageStyle: BrandManifesto["languageStyle"];
  contentDos: string[];
  contentDonts: string[];
  bannedWords: string[];
  requiredDisclosures: string[];
};

export function getCanonicalVoiceModel(manifesto: BrandManifesto): CanonicalVoiceModel {
  return {
    voiceAttributes: normalizeList(manifesto.voiceAttributes, []),
    toneSpectrum: manifesto.toneSpectrum,
    languageStyle: manifesto.languageStyle,
    contentDos: normalizeList(manifesto.contentDos, []),
    contentDonts: normalizeList(manifesto.contentDonts, []),
    bannedWords: normalizeList(manifesto.bannedWords, []),
    requiredDisclosures: normalizeList(manifesto.requiredDisclosures, []),
  };
}

export function applyCanonicalVoiceModel(
  manifesto: BrandManifesto,
  voice: Partial<CanonicalVoiceModel>
): BrandManifesto {
  return createEmptyBrandManifesto({
    ...manifesto,
    voiceAttributes: voice.voiceAttributes ?? manifesto.voiceAttributes,
    toneSpectrum: voice.toneSpectrum ?? manifesto.toneSpectrum,
    languageStyle: voice.languageStyle ?? manifesto.languageStyle,
    contentDos: voice.contentDos ?? manifesto.contentDos,
    contentDonts: voice.contentDonts ?? manifesto.contentDonts,
    bannedWords: voice.bannedWords ?? manifesto.bannedWords,
    requiredDisclosures: voice.requiredDisclosures ?? manifesto.requiredDisclosures,
  });
}
