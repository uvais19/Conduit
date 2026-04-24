import type { ZodError } from "zod";
import { generateJson, resolveGeminiModel, resolveGeminiThinking } from "@/lib/ai/clients";
import {
  createEmptyBrandManifesto,
  textToList,
  textToListByLine,
} from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";
import type {
  DiscoveryInput,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";
import {
  buildFallbackProductsServices,
  buildMinimalHybridManifesto,
  coerceDiscoveryManifestoMerge,
  finalizeManifestoFromMerge,
  manifestoSynthesisWarn,
  mergeIdentitySynthesizerLayers,
} from "./manifesto-synthesis-helpers";

function buildFallbackManifesto(
  input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): BrandManifesto {
  const voiceAttributes = textToList(input.brandTone || "")
    .slice(0, 6)
    .map((item) => item.replace(/^[-•]\s*/, ""));

  const offerings = textToListByLine(input.offerings || "");
  const differentiators = textToListByLine(input.differentiators || "");

  return createEmptyBrandManifesto({
    businessName: input.businessName,
    industry: input.industry,
    missionStatement: `Help ${input.targetAudience} succeed through ${offerings[0] || "consistent value"}.`,
    vision: `Become a trusted ${input.industry.toLowerCase()} brand known for clear, reliable communication.`,
    coreValues: ["Clarity", "Consistency", "Customer Focus"],
    productsServices: buildFallbackProductsServices(input, scraper, documents),
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

function formatZodIssuesForRepair(error: ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.map((k) => String(k)).join(".");
      return `${path || "(root)"}: ${i.message}`;
    })
    .join("\n");
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
  const manifestoModel = resolveGeminiModel("manifesto");
  const manifestoThinking = resolveGeminiThinking("manifesto", manifestoModel);

  const generated = await generateJson<Partial<BrandManifesto>>({
    systemPrompt: `You are the Identity Synthesizer Agent for Conduit, an AI social media manager.
Your job is to combine website findings, uploaded documents, and manual business answers into a Brand Manifesto JSON object.

STRICT FIELD CONSTRAINTS — you must follow these exactly or the output will be rejected:

languageStyle (pick one value per field from the allowed list only):
  sentenceLength: "short" | "medium" | "long" | "varied"
    short = punchy, under 15 words; medium = balanced 15–25 words; long = detailed 25+ words; varied = intentional mix
  vocabulary: "simple" | "professional" | "technical" | "mixed"
    simple = plain everyday language; professional = business/industry standard; technical = jargon-heavy specialist; mixed = blend
  perspective: "first-person" | "third-person" | "mixed"
    first-person = we/our/us; third-person = the company/brand name; mixed = both depending on context
  emojiUsage: "none" | "minimal" | "moderate" | "heavy"
    none = no emojis ever; minimal = 1 per post max; moderate = 2–3 per post; heavy = emojis throughout

toneSpectrum (integer 1–10 for each, where 1 = very low, 10 = very high):
  formal: how formal vs casual the writing should be
  playful: how much humour, wit, and lightness
  technical: how much industry terminology and depth
  emotional: how much feeling, empathy, and storytelling
  provocative: how much bold, challenging, or contrarian content

productsServices (array of offerings — critical):
  - Emit one object per real offering from the user's manual offerings list (same count and order as the template rows unless the evidence clearly merges or splits an offering).
  - Each object: { "name": string, "description": string, "targetAudience"?: string }
  - description: one or two sentences grounded in WEBSITE DISCOVERY (summary, keyPoints, title, description) and/or DOCUMENT ANALYSIS when possible. State what the offer is and the concrete outcome or mechanism — not generic filler.
  - Do NOT use the same audience boilerplate on every line (e.g. repeating the full ICP or the same "for <audience>" clause for each product).
  - targetAudience is OPTIONAL. Use only a short segment label when a row clearly serves a different buyer than other rows (e.g. "Enterprise IT", "solo founders"). Never paste the full primary ICP paragraph into every product row.

All other fields:
  coreValues: array of 3–5 short phrases, not full sentences
  voiceAttributes: array of 4–6 single adjectives (e.g. "confident", "warm", "direct")
  socialMediaGoals: array of 3–5 clear goal statements
  keyMessages: array of 3–5 messages, each a single concise sentence
  contentDos: array of 3–6 actionable instructions starting with a verb
  contentDonts: array of 3–6 prohibitions starting with "Never" or "Avoid" or "Don't"
  uniqueSellingPropositions: array of 2–4 distinct differentiators, each a single sentence
  missionStatement: one sentence, starts with a verb (e.g. "Help...", "Empower...", "Transform...")
  vision: one sentence describing the long-term aspiration
  primaryAudience.demographics: 1–2 sentences describing who they are (role, industry, company size, location)
  primaryAudience.psychographics: 1–2 sentences describing their values, motivations, and mindset
  primaryAudience.painPoints: array of 3–5 specific pain points
  primaryAudience.desires: array of 3–5 things they want to achieve
  secondaryAudiences: array of additional audience segments, same structure as primaryAudience (omit if none are clearly evident)

Return valid JSON only. No markdown, no explanation, no code fences.`,
    userPrompt: [
      "Fill every field using the data below. Use the JSON structure provided as your template.",
      "",
      "TEMPLATE STRUCTURE (fill all fields):",
      JSON.stringify(fallback, null, 2),
      "",
      "MANUAL INPUT FROM USER:",
      JSON.stringify(input, null, 2),
      "",
      "WEBSITE DISCOVERY:",
      JSON.stringify(scraper, null, 2),
      "",
      "DOCUMENT ANALYSIS:",
      JSON.stringify(documents, null, 2),
      "",
      "Return the completed JSON object only. Be specific, practical, and grounded in the actual business data above.",
    ].join("\n"),
    temperature: 0.3,
    geminiModel: manifestoModel,
    geminiThinking: manifestoThinking,
    fallback,
  });

  const merged = mergeIdentitySynthesizerLayers(fallback, generated);
  const first = finalizeManifestoFromMerge(merged);
  if (first.success) {
    return first.data;
  }

  manifestoSynthesisWarn("repair_llm", formatZodIssuesForRepair(first.error));

  const coercedBase = coerceDiscoveryManifestoMerge(merged);
  const repaired = await generateJson<Partial<BrandManifesto>>({
    systemPrompt: `You repair Brand Manifesto JSON for Conduit. Output MUST be a single JSON object that satisfies the same schema as the input manifest (all required fields, correct enum strings, toneSpectrum integers 1–10, arrays of strings where specified).

Rules:
- Preserve correct content from the input where it already matches the schema.
- Fix only what the validation errors require; keep business-specific wording when valid.
- productsServices must remain an array of { name, description, optional targetAudience } with grounded descriptions, no repeated ICP boilerplate on every row.
Return JSON only. No markdown or code fences.`,
    userPrompt: [
      "VALIDATION ISSUES (fix all):",
      formatZodIssuesForRepair(first.error),
      "",
      "MANIFEST TO REPAIR (JSON):",
      JSON.stringify(coercedBase, null, 2),
    ].join("\n"),
    temperature: 0.1,
    geminiModel: manifestoModel,
    geminiThinking: manifestoThinking,
    fallback: {},
  });

  const mergedAfterRepair = mergeIdentitySynthesizerLayers(
    coercedBase as BrandManifesto,
    repaired
  );
  const second = finalizeManifestoFromMerge(mergedAfterRepair);
  if (second.success) {
    return second.data;
  }

  return buildMinimalHybridManifesto(input, scraper, documents);
}
