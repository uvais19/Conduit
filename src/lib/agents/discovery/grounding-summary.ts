import type {
  DiscoveryInput,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";

/**
 * Short trust copy describing which inputs shaped the manifesto (not field-level provenance).
 */
export function buildGroundingSummary(
  _input: DiscoveryInput,
  scraper: ScraperResult,
  documents: DocumentAnalysisResult
): string {

  const site =
    scraper.source === "website"
      ? "your live website"
      : scraper.source === "unavailable"
        ? "your business details when the site could not be fetched"
        : "your manual business details (no website crawl)";

  const uploads =
    documents.documentCount > 0
      ? `your ${documents.documentCount} uploaded file${documents.documentCount === 1 ? "" : "s"}`
      : "no uploaded files this round";

  return `Grounded in your onboarding answers, ${site}, and ${uploads}.`;
}
