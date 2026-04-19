import { generateText } from "@/lib/ai/clients";
import type { DiscoveryInput, DocumentAnalysisResult } from "./types";

/** Same payload as the analyst’s no-input early return; used by the discovery graph to skip work. */
export function emptyDocumentAnalysisResult(): DocumentAnalysisResult {
  return {
    summary: "No supporting documents were uploaded yet.",
    insights: ["Discovery will rely on website content and manual answers."],
    documentCount: 0,
  };
}

export async function runDocumentAnalystAgent(
  input: DiscoveryInput
): Promise<DocumentAnalysisResult> {
  const documentSnippets = input.documents.map((document) => {
    const noteText = document.notes?.trim() || document.extractedText?.trim() || "";
    return `${document.fileName} (${document.fileType})${noteText ? `: ${noteText}` : ""}`;
  });

  const fallbackInsights = [
    ...documentSnippets,
    ...(input.notes ? [input.notes] : []),
  ].filter(Boolean);

  if (fallbackInsights.length === 0) {
    return emptyDocumentAnalysisResult();
  }

  const prompt = [
    "Summarize the brand insights contained in these notes/documents.",
    "Return concise bullet-style sentences focused on brand identity, offers, audience, and tone.",
    fallbackInsights.join("\n"),
  ].join("\n\n");

  const aiSummary = await generateText({
    systemPrompt:
      "You are the Document Analyst Agent for a social media marketing app. Extract only the most useful brand insights.",
    userPrompt: prompt,
    temperature: 0.2,
  });

  const summary =
    aiSummary ||
    `Document insights collected from ${fallbackInsights.length} source(s): ${fallbackInsights.join(" | ")}`;

  const insights = summary
    .split(/\n|•|-/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    summary,
    insights: insights.length > 0 ? insights : fallbackInsights,
    documentCount: input.documents.length,
  };
}
