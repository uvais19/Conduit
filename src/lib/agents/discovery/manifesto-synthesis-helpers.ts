import {
  createEmptyBrandManifesto,
  safeParseBrandManifestoFromPartial,
  textToListByLine,
} from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";
import type {
  DiscoveryInput,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";

const MANIFESTO_WARN = "[conduit:manifesto]";

export function manifestoSynthesisWarn(kind: "repair_llm" | "minimal_fallback", detail?: string): void {
  console.warn(`${MANIFESTO_WARN} ${kind}`, detail ?? "");
}

/** Meaningful tokens for matching offering names to site copy (length > 1). */
function matchTokens(phrase: string): Set<string> {
  const raw = phrase
    .toLowerCase()
    .split(/[\s/|,;:()[\]{}]+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
  return new Set(raw.filter((t) => t.length > 1));
}

function scoreLineAgainstOffering(line: string, offeringTokens: Set<string>): number {
  if (!line.trim()) return 0;
  const lineTokens = matchTokens(line);
  let score = 0;
  for (const t of offeringTokens) {
    if (lineTokens.has(t)) score += 1;
  }
  if (offeringTokens.size > 0) {
    const phrase = [...offeringTokens].join(" ");
    if (phrase.length >= 4 && line.toLowerCase().includes(phrase)) {
      score += 2;
    }
  }
  return score;
}

function sentencesFromBlob(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function corpusLines(
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): { line: string; source: "site" | "doc" }[] {
  const out: { line: string; source: "site" | "doc" }[] = [];
  if (scraper.title?.trim()) {
    out.push({ line: scraper.title.trim(), source: "site" });
  }
  if (scraper.description?.trim()) {
    out.push({ line: scraper.description.trim(), source: "site" });
  }
  if (scraper.summary?.trim()) {
    for (const line of sentencesFromBlob(scraper.summary)) {
      out.push({ line, source: "site" });
    }
  }
  for (const kp of scraper.keyPoints ?? []) {
    if (kp?.trim()) out.push({ line: kp.trim(), source: "site" });
  }
  for (const insight of documents.insights ?? []) {
    if (insight?.trim()) out.push({ line: insight.trim(), source: "doc" });
  }
  if (documents.summary?.trim()) {
    for (const line of sentencesFromBlob(documents.summary)) {
      out.push({ line, source: "doc" });
    }
  }
  return out;
}

function shortenSentence(s: string, maxLen: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  if (one.length <= maxLen) {
    return one.endsWith(".") ? one : `${one}.`;
  }
  const cut = one.slice(0, maxLen - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${base}…`;
}

/**
 * Prefer site/doc copy that references the offering; otherwise a short neutral line (no full ICP).
 */
export function describeOfferingFromSignals(
  offerName: string,
  input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): string {
  const tokens = matchTokens(offerName);
  let best: { line: string; score: number } | null = null;
  for (const { line } of corpusLines(scraper, documents)) {
    const score = scoreLineAgainstOffering(line, tokens);
    if (score > 0 && (!best || score > best.score)) {
      best = { line, score };
    }
  }
  if (best && best.score > 0) {
    return shortenSentence(best.line, 160);
  }
  const industry = input.industry.trim() || "your space";
  return shortenSentence(
    `${offerName} — core ${industry.toLowerCase()} capability focused on clear outcomes and dependable delivery.`,
    140
  );
}

function shortSegmentLabel(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < 3 || t.length > 52) return undefined;
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

/** Per-row audience: short differentiator-aligned segment when available; avoid repeating full ICP on every line. */
function productRowTargetAudience(
  index: number,
  differentiators: string[],
  fullIcp: string,
  offeringCount: number
): string | undefined {
  const fromDiff = shortSegmentLabel(differentiators[index]);
  if (fromDiff) return fromDiff;
  if (offeringCount === 1) {
    return shortSegmentLabel(fullIcp);
  }
  return undefined;
}

export function buildFallbackProductsServices(
  input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): BrandManifesto["productsServices"] | undefined {
  const offerings = textToListByLine(input.offerings || "");
  const differentiators = textToListByLine(input.differentiators || "");
  if (offerings.length === 0) return undefined;
  const n = offerings.length;
  return offerings.map((item, index) => ({
    name: item,
    description: describeOfferingFromSignals(item, input, scraper, documents),
    targetAudience: productRowTargetAudience(index, differentiators, input.targetAudience, n),
  }));
}

export function mergeIdentitySynthesizerLayers(
  fallback: BrandManifesto,
  generated: Partial<BrandManifesto>
): Partial<BrandManifesto> {
  return {
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
    brandColors: generated.brandColors ?? fallback.brandColors,
  };
}

function asTrimmedString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function sanitizeBrandColors(
  c: BrandManifesto["brandColors"] | unknown
): BrandManifesto["brandColors"] | undefined {
  if (!c || typeof c !== "object") return undefined;
  const o = c as Record<string, unknown>;
  const primary = asTrimmedString(o.primary);
  const secondary = asTrimmedString(o.secondary);
  const accent = asTrimmedString(o.accent);
  if (primary && secondary && accent) {
    return { primary, secondary, accent };
  }
  return undefined;
}

function sanitizeProductsServices(
  value: unknown
): BrandManifesto["productsServices"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: BrandManifesto["productsServices"] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const name = asTrimmedString(o.name) || "Primary Offer";
    const description =
      asTrimmedString(o.description) || "Describe your main offer.";
    const targetAudience = asTrimmedString(o.targetAudience);
    rows.push({
      name,
      description,
      targetAudience: targetAudience && targetAudience.length <= 80 ? targetAudience : undefined,
    });
  }
  return rows.length > 0 ? rows : undefined;
}

function sanitizeSecondaryAudiences(
  value: unknown
): BrandManifesto["secondaryAudiences"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: NonNullable<BrandManifesto["secondaryAudiences"]> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const demographics = asTrimmedString(o.demographics);
    const psychographics = asTrimmedString(o.psychographics);
    if (!demographics && !psychographics) continue;
    out.push({
      demographics: demographics || "Secondary audience segment.",
      psychographics:
        psychographics || "They share goals and challenges similar to the primary audience.",
      painPoints: asStringArray(o.painPoints),
      desires: asStringArray(o.desires),
    });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Best-effort cleanup after model merge so {@link safeParseBrandManifestoFromPartial} succeeds more often.
 */
export function coerceDiscoveryManifestoMerge(
  merged: Partial<BrandManifesto>
): Partial<BrandManifesto> {
  const primary = merged.primaryAudience;
  const next: Partial<BrandManifesto> = {
    ...merged,
    brandColors: sanitizeBrandColors(merged.brandColors),
    secondaryAudiences: sanitizeSecondaryAudiences(merged.secondaryAudiences),
  };

  const productsSanitized = sanitizeProductsServices(merged.productsServices);
  if (productsSanitized !== undefined) {
    next.productsServices = productsSanitized;
  } else if (merged.productsServices !== undefined) {
    delete (next as { productsServices?: unknown }).productsServices;
  }

  if (primary && typeof primary === "object") {
    const p = primary as Record<string, unknown>;
    next.primaryAudience = {
      demographics:
        asTrimmedString(p.demographics) ??
        merged.primaryAudience?.demographics ??
        "Professionals and decision-makers who fit the core customer profile.",
      psychographics:
        asTrimmedString(p.psychographics) ??
        merged.primaryAudience?.psychographics ??
        "They value trust, clarity, quality, and practical results.",
      painPoints: asStringArray(p.painPoints) ?? merged.primaryAudience?.painPoints,
      desires: asStringArray(p.desires) ?? merged.primaryAudience?.desires,
    };
  }

  return next;
}

export function finalizeManifestoFromMerge(merged: Partial<BrandManifesto>) {
  const coerced = coerceDiscoveryManifestoMerge(merged);
  return safeParseBrandManifestoFromPartial(coerced);
}

export function buildMinimalHybridManifesto(
  input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): BrandManifesto {
  const productsServices = buildFallbackProductsServices(input, scraper, documents);
  manifestoSynthesisWarn(
    "minimal_fallback",
    `business=${input.businessName}; industry=${input.industry}`
  );
  return createEmptyBrandManifesto({
    businessName: input.businessName,
    industry: input.industry,
    productsServices,
  });
}
