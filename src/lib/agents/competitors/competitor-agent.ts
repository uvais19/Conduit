import { generateJson, resolveGeminiModel, resolveGeminiThinking } from "@/lib/ai/clients";
import {
  addCompetitor,
  getCompetitorById,
  listCompetitors,
  updateCompetitorAnalysis,
} from "@/lib/optimization/store";
import type { CompetitorAnalysis } from "@/lib/optimization/types";
import type { Platform } from "@/lib/types";

type DiscoveredCompetitor = {
  name: string;
  platform: Platform;
  profileUrl: string;
};

const DEFAULT_ANALYSIS: CompetitorAnalysis = {
  postingFrequency: "Unknown",
  schedulePatterns: "Unknown",
  contentTypes: [],
  engagementRate: 0,
  hashtagStrategy: [],
  topThemes: [],
  summary: "Analysis pending",
};

export async function discoverCompetitors(
  tenantId: string,
  industry: string,
  location: string
): Promise<DiscoveredCompetitor[]> {
  const analysisModel = resolveGeminiModel("analysis");
  const analysisThinking = resolveGeminiThinking("analysis", analysisModel);
  const existing = await listCompetitors(tenantId);
  const existingNames = existing.map((c) => c.name.toLowerCase());

  const fallback: DiscoveredCompetitor[] = [];

  const discovered = await generateJson<DiscoveredCompetitor[]>({
    systemPrompt: [
      "You are the Competitor Agent for Conduit, an AI social media manager.",
      "Discover potential competitors for a business based on their industry and location.",
      "Return businesses that would be active on social media and compete for the same audience.",
      "Return a JSON array of competitor objects.",
    ].join(" "),
    userPrompt: [
      `Industry: ${industry}`,
      `Location: ${location}`,
      "",
      "Already tracked competitors (do not include these):",
      existingNames.length > 0 ? existingNames.join(", ") : "None",
      "",
      "Return up to 5 competitors. Each must have:",
      '- name: business name',
      '- platform: one of "instagram", "facebook", "linkedin"',
      '- profileUrl: a plausible social media profile URL',
      "",
      "Return JSON array only. Return [] if you cannot identify competitors.",
    ].join("\n"),
    temperature: 0.4,
    geminiModel: analysisModel,
    geminiThinking: analysisThinking,
    fallback,
  });

  const VALID_PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin"];

  const valid = (Array.isArray(discovered) ? discovered : []).filter(
    (c) =>
      c.name &&
      c.platform &&
      VALID_PLATFORMS.includes(c.platform) &&
      c.profileUrl &&
      !existingNames.includes(c.name.toLowerCase())
  );

  await Promise.all(
    valid.map((c) =>
      addCompetitor({
        tenantId,
        name: c.name,
        platform: c.platform,
        profileUrl: c.profileUrl,
        discoveryMethod: "ai-discovered",
      })
    )
  );

  return valid;
}

export async function analyzeCompetitor(
  tenantId: string,
  competitorId: string
): Promise<CompetitorAnalysis | null> {
  const analysisModel = resolveGeminiModel("analysis");
  const analysisThinking = resolveGeminiThinking("analysis", analysisModel);
  const competitor = await getCompetitorById(tenantId, competitorId);
  if (!competitor) return null;

  const analysis = await generateJson<CompetitorAnalysis>({
    systemPrompt: [
      "You are the Competitor Agent for Conduit, an AI social media manager.",
      "Analyze a competitor's social media presence and provide insights.",
      "Return a JSON object with the analysis.",
    ].join(" "),
    userPrompt: [
      `Competitor: ${competitor.name}`,
      `Platform: ${competitor.platform}`,
      `Profile URL: ${competitor.profileUrl}`,
      "",
      "Analyze and return:",
      '- postingFrequency: e.g. "3-4 times per week"',
      '- schedulePatterns: e.g. "Weekday mornings 8-10 AM"',
      "- contentTypes: array of types like [\"carousels\", \"reels\", \"stories\"]",
      "- engagementRate: estimated engagement rate as decimal",
      "- hashtagStrategy: array of commonly used hashtags",
      "- topThemes: array of content themes they focus on",
      "- summary: 2-3 sentence overview of their social presence",
      "",
      "Return JSON only.",
    ].join("\n"),
    temperature: 0.3,
    geminiModel: analysisModel,
    geminiThinking: analysisThinking,
    fallback: DEFAULT_ANALYSIS,
  });

  await updateCompetitorAnalysis(tenantId, competitorId, analysis);
  return analysis;
}

export async function getCompetitorInsightsForStrategy(
  tenantId: string
): Promise<string | null> {
  const competitors = await listCompetitors(tenantId);
  const analyzed = competitors.filter((c) => c.analysisData);

  if (analyzed.length === 0) return null;

  return analyzed
    .map((c) =>
      [
        `Competitor: ${c.name} (${c.platform})`,
        `Posting: ${c.analysisData!.postingFrequency}`,
        `Content types: ${c.analysisData!.contentTypes.join(", ")}`,
        `Top themes: ${c.analysisData!.topThemes.join(", ")}`,
        `Engagement: ${c.analysisData!.engagementRate}`,
        `Summary: ${c.analysisData!.summary}`,
      ].join("\n")
    )
    .join("\n\n");
}
