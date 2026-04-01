import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createEmptyBrandManifesto } from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";
import { runDocumentAnalystAgent } from "./document-analyst-agent";
import { runIdentitySynthesizerAgent } from "./identity-synthesizer-agent";
import { runScraperAgent } from "./scraper-agent";
import type {
  DiscoveryInput,
  DiscoveryResult,
  DocumentAnalysisResult,
  ScraperResult,
} from "./types";

const DiscoveryState = Annotation.Root({
  input: Annotation<DiscoveryInput>,
  scraper: Annotation<ScraperResult | null>,
  documents: Annotation<DocumentAnalysisResult | null>,
  manifesto: Annotation<BrandManifesto | null>,
});

const discoveryGraph = new StateGraph(DiscoveryState)
  .addNode("scrape_website", async (state) => ({
    scraper: await runScraperAgent(state.input),
  }))
  .addNode("analyze_documents", async (state) => ({
    documents: await runDocumentAnalystAgent(state.input),
  }))
  .addNode("synthesize_identity", async (state) => ({
    manifesto: await runIdentitySynthesizerAgent({
      input: state.input,
      scraper:
        state.scraper ?? {
          summary: "No website summary available.",
          keyPoints: [],
          source: "manual",
        },
      documents:
        state.documents ?? {
          summary: "No document analysis available.",
          insights: [],
          documentCount: 0,
        },
    }),
  }))
  .addEdge(START, "scrape_website")
  .addEdge(START, "analyze_documents")
  .addEdge("scrape_website", "synthesize_identity")
  .addEdge("analyze_documents", "synthesize_identity")
  .addEdge("synthesize_identity", END)
  .compile();

export async function runDiscoveryPipeline(
  input: DiscoveryInput
): Promise<DiscoveryResult> {
  const result = await discoveryGraph.invoke({
    input,
    scraper: null,
    documents: null,
    manifesto: null,
  });

  return {
    scraper:
      result.scraper ?? {
        summary: "No website summary available.",
        keyPoints: [],
        source: "manual",
      },
    documents:
      result.documents ?? {
        summary: "No document analysis available.",
        insights: [],
        documentCount: 0,
      },
    manifesto: result.manifesto ?? createEmptyBrandManifesto({
      businessName: input.businessName,
      industry: input.industry,
    }),
  };
}
