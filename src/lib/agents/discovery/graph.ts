import type { BrandManifesto } from "@/lib/types";
import {
  emptyDocumentAnalysisResult,
  runDocumentAnalystAgent,
} from "./document-analyst-agent";
import { runIdentitySynthesizerAgent } from "./identity-synthesizer-agent";
import { runScraperAgent } from "./scraper-agent";
import type {
  DiscoveryInput,
  DiscoveryProgressHandler,
  DiscoveryResult,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";

const defaultScraper = (): ScraperResult => ({
  summary: "No website summary available.",
  keyPoints: [],
  source: "manual",
});

const defaultDocuments = (): DocumentAnalysisResult => ({
  summary: "No document analysis available.",
  insights: [],
  documentCount: 0,
});

function siteCompleteMessage(source: ScraperResult["source"]): string {
  if (source === "website") {
    return "Website reviewed (live crawl).";
  }
  if (source === "unavailable") {
    return "Website could not be read — using your manual details.";
  }
  return "No website URL — using your manual business details.";
}

function documentsCompleteMessage(documentCount: number): string {
  if (documentCount > 0) {
    return `Reviewed ${documentCount} uploaded file${documentCount === 1 ? "" : "s"}.`;
  }
  return "No uploads — relying on your site and form answers.";
}

export async function runDiscoveryPipeline(
  input: DiscoveryInput,
  onProgress?: DiscoveryProgressHandler
): Promise<DiscoveryResult> {
  onProgress?.({
    phase: "gathering",
    message: "Reading your site and reviewing uploads…",
  });

  const scraperPromise = runScraperAgent(input).then((scraper) => {
    onProgress?.({
      phase: "site_complete",
      message: siteCompleteMessage(scraper.source),
      source: scraper.source,
    });
    return scraper;
  });

  const skipDocumentAnalyst =
    input.documents.length === 0 && !input.notes?.trim();

  const documentsPromise = skipDocumentAnalyst
    ? Promise.resolve(emptyDocumentAnalysisResult()).then((documents) => {
        onProgress?.({
          phase: "documents_complete",
          message: documentsCompleteMessage(documents.documentCount),
          documentCount: documents.documentCount,
        });
        return documents;
      })
    : runDocumentAnalystAgent(input).then((documents) => {
        onProgress?.({
          phase: "documents_complete",
          message: documentsCompleteMessage(documents.documentCount),
          documentCount: documents.documentCount,
        });
        return documents;
      });

  const [scraperRaw, documentsRaw] = await Promise.all([
    scraperPromise,
    documentsPromise,
  ]);

  const scraper = scraperRaw ?? defaultScraper();
  const documents = documentsRaw ?? defaultDocuments();

  onProgress?.({
    phase: "synthesizing",
    message: "Writing your brand manifesto…",
  });

  const manifesto: BrandManifesto = await runIdentitySynthesizerAgent({
    input,
    scraper,
    documents,
  });

  return {
    scraper,
    documents,
    manifesto,
  };
}
