import { describe, expect, it } from "vitest";
import { buildGroundingSummary } from "@/lib/agents/discovery/grounding-summary";
import type {
  DiscoveryInput,
  DocumentAnalysisResult,
  ScraperResult,
} from "@/lib/agents/discovery/types";

const baseInput: DiscoveryInput = {
  websiteUrl: "https://example.com",
  businessName: "Acme",
  industry: "Software",
  targetAudience: "SMBs",
  goals: "Leads",
  offerings: "Widgets",
  differentiators: "",
  brandTone: "",
  contentDos: "",
  contentDonts: "",
  notes: "",
  documents: [],
};

function doc(count: number): DocumentAnalysisResult {
  return {
    summary: count > 0 ? "Has docs" : "No docs",
    insights: [],
    documentCount: count,
  };
}

describe("buildGroundingSummary", () => {
  it("describes live website and uploads", () => {
    const scraper: ScraperResult = {
      summary: "Site",
      keyPoints: [],
      source: "website",
    };
    expect(buildGroundingSummary(baseInput, scraper, doc(2))).toBe(
      "Grounded in your onboarding answers, your live website, and your 2 uploaded files."
    );
  });

  it("describes unavailable site and no uploads", () => {
    const scraper: ScraperResult = {
      summary: "Fallback",
      keyPoints: [],
      source: "unavailable",
    };
    expect(buildGroundingSummary(baseInput, scraper, doc(0))).toBe(
      "Grounded in your onboarding answers, your business details when the site could not be fetched, and no uploaded files this round."
    );
  });

  it("describes manual path and single upload", () => {
    const scraper: ScraperResult = {
      summary: "Manual",
      keyPoints: [],
      source: "manual",
    };
    expect(buildGroundingSummary(baseInput, scraper, doc(1))).toBe(
      "Grounded in your onboarding answers, your manual business details (no website crawl), and your 1 uploaded file."
    );
  });

  it("uses plural uploads copy for multiple files", () => {
    const scraper: ScraperResult = {
      summary: "S",
      keyPoints: [],
      source: "manual",
    };
    expect(buildGroundingSummary(baseInput, scraper, doc(3))).toContain(
      "your 3 uploaded files"
    );
  });
});
