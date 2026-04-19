import { describe, expect, it } from "vitest";
import { emptyDocumentAnalysisResult } from "@/lib/agents/discovery/document-analyst-agent";
import { normalizeOnboardingWebsiteUrl } from "@/lib/onboarding/url";

describe("normalizeOnboardingWebsiteUrl", () => {
  it("returns empty for whitespace-only input", () => {
    expect(normalizeOnboardingWebsiteUrl("   ")).toBe("");
  });

  it("adds https, lowercases host, strips trailing slash on path", () => {
    expect(normalizeOnboardingWebsiteUrl("Example.COM/about/")).toBe(
      "https://example.com/about"
    );
  });

  it("preserves http scheme when provided", () => {
    expect(normalizeOnboardingWebsiteUrl("http://SITE.example/foo")).toBe(
      "http://site.example/foo"
    );
  });

  it("strips hash from URL", () => {
    expect(
      normalizeOnboardingWebsiteUrl("https://docs.example.com/guide#section")
    ).toBe("https://docs.example.com/guide");
  });
});

describe("emptyDocumentAnalysisResult", () => {
  it("matches the document analyst no-input payload", () => {
    const empty = emptyDocumentAnalysisResult();
    expect(empty.documentCount).toBe(0);
    expect(empty.summary).toContain("No supporting documents");
    expect(empty.insights.some((i) => i.includes("website content"))).toBe(
      true
    );
  });
});
