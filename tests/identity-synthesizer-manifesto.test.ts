import { describe, expect, it } from "vitest";
import { safeParseBrandManifestoFromPartial } from "@/lib/brand/manifesto";
import {
  buildMinimalHybridManifesto,
  coerceDiscoveryManifestoMerge,
  describeOfferingFromSignals,
} from "@/lib/agents/discovery/manifesto-synthesis-helpers";
import type { DiscoveryInput, DocumentAnalysisResult, ScraperResult } from "@/lib/agents/discovery/types";

const baseInput = (): DiscoveryInput => ({
  websiteUrl: "https://example.com",
  businessName: "Acme Co",
  industry: "Software",
  targetAudience: "Enterprise IT leaders and procurement teams across North America seeking long-term vendor partnerships",
  goals: "Grow awareness\nEngage buyers",
  offerings: "API Management Platform\nDeveloper Portal",
  differentiators: "SOC 2 Type II\nEU data residency",
  brandTone: "",
  contentDos: "",
  contentDonts: "",
  notes: "",
  documents: [],
});

const emptyDocs = (): DocumentAnalysisResult => ({
  summary: "",
  insights: [],
  documentCount: 0,
});

describe("describeOfferingFromSignals", () => {
  it("prefers site keyPoints/summary when the offering matches", () => {
    const scraper: ScraperResult = {
      summary:
        "We sell shoes. Our API Management Platform handles traffic shaping and auth for high-scale APIs.",
      keyPoints: ["API Management Platform with rate limiting and OAuth2"],
      source: "website",
    };
    const desc = describeOfferingFromSignals(
      "API Management Platform",
      baseInput(),
      scraper,
      emptyDocs()
    );
    expect(desc.toLowerCase()).toContain("api");
    expect(desc.toLowerCase()).not.toMatch(/^api management platform for enterprise it leaders/);
  });

  it("uses neutral industry-grounded copy when no site match", () => {
    const scraper: ScraperResult = {
      summary: "Generic marketing fluff about innovation.",
      keyPoints: ["We are innovative"],
      source: "website",
    };
    const desc = describeOfferingFromSignals("Widget Pro", baseInput(), scraper, emptyDocs());
    expect(desc).toContain("Widget Pro");
    expect(desc.toLowerCase()).toContain("software");
  });
});

describe("safeParseBrandManifestoFromPartial + coercion path", () => {
  it("accepts out-of-range toneSpectrum values after candidate build (clamped)", () => {
    const r = safeParseBrandManifestoFromPartial({
      toneSpectrum: {
        formal: 99,
        playful: -3,
        technical: 3.7,
        emotional: 0,
        provocative: 11,
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.toneSpectrum.formal).toBe(10);
      expect(r.data.toneSpectrum.playful).toBe(1);
      expect(r.data.toneSpectrum.technical).toBe(4);
      expect(r.data.toneSpectrum.emotional).toBe(1);
      expect(r.data.toneSpectrum.provocative).toBe(10);
    }
  });

  it("coerceDiscoveryManifestoMerge drops invalid brandColors and keeps valid triples", () => {
    const merged = coerceDiscoveryManifestoMerge({
      businessName: "X",
      industry: "Y",
      coreValues: ["a"],
      uniqueSellingPropositions: ["u"],
      voiceAttributes: ["v"],
      socialMediaGoals: ["g"],
      keyMessages: ["k"],
      contentDos: ["d"],
      contentDonts: ["n"],
      primaryAudience: {
        demographics: "d",
        psychographics: "p",
      },
      productsServices: [{ name: "P", description: "D" }],
      toneSpectrum: { formal: 5, playful: 5, technical: 5, emotional: 5, provocative: 5 },
      languageStyle: {
        sentenceLength: "medium",
        vocabulary: "professional",
        perspective: "mixed",
        emojiUsage: "minimal",
      },
      brandColors: { primary: "#fff" } as unknown as import("@/lib/types").BrandManifesto["brandColors"],
    });
    expect(merged.brandColors).toBeUndefined();
  });
});

describe("buildMinimalHybridManifesto", () => {
  it("keeps businessName, industry, and offerings-derived products; other fields use defaults", () => {
    const input = baseInput();
    const scraper: ScraperResult = {
      summary: "Portal for self-serve API keys.",
      keyPoints: ["Developer Portal with sandbox keys"],
      source: "website",
    };
    const m = buildMinimalHybridManifesto(input, scraper, emptyDocs());

    expect(m.businessName).toBe("Acme Co");
    expect(m.industry).toBe("Software");
    expect(m.productsServices).toHaveLength(2);
    expect(m.productsServices[0].name).toBe("API Management Platform");
    expect(m.productsServices[1].name).toBe("Developer Portal");
    expect(m.coreValues).toEqual(["Customer focus", "Consistency", "Integrity"]);
    expect(m.missionStatement).toContain("Help our customers succeed");
  });
});
