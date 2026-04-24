import { generateJson, resolveGeminiModel, resolveGeminiThinking } from "@/lib/ai/clients";
import { getPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import {
  postAnalysisSchema,
  type BrandManifesto,
  type ContentStrategy,
  type FetchedPost,
  type Platform,
  type PostAnalysis,
} from "@/lib/types";

function createDefaultAnalysis(): PostAnalysis {
  return {
    detectedTone: ["neutral"],
    contentMix: [{ type: "general", percentage: 100 }],
    postingFrequency: {
      postsPerWeek: 0,
      mostActiveDay: "unknown",
      mostActiveTime: "unknown",
    },
    performanceByType: [],
    performanceByTopic: [],
    bestPostingTimes: [],
    topPosts: [],
    underperformingPosts: [],
    engagementSummary: {
      avgEngagementRate: 0,
      totalReach: 0,
      totalImpressions: 0,
      bestPostType: "unknown",
      worstPostType: "unknown",
    },
    gapsVsManifesto: [],
    gapsVsStrategy: [],
    overallScore: 50,
    keyInsights: ["Not enough data to generate insights."],
    recommendations: ["Connect more platforms and post more content."],
    summary: "Insufficient data for a meaningful analysis.",
  };
}

function buildPlatformAnalysisContext(platform: Platform): string {
  const platformSpecific: Record<Platform, string> = {
    instagram: [
      "Instagram-specific analysis:",
      "- Saves are the MOST important metric -- high saves = bookmark-worthy, algorithm-boosting content",
      "- Evaluate carousel completion rates (do people swipe through all slides?)",
      "- Reel view-through rate indicates content quality",
      "- Check hashtag effectiveness: are they driving discovery?",
      "- Does content follow hook-value-CTA structure?",
      "- Are images using optimal dimensions (1080x1080 feed, 1080x1350 portrait, 1080x1920 stories)?",
      "- A good engagement rate on Instagram is 1-3% (above 3% is excellent)",
    ].join("\n"),

    linkedin: [
      "LinkedIn-specific analysis:",
      "- Comment DEPTH matters more than comment count (long, thoughtful comments > short reactions)",
      "- Document/carousel (PDF) posts typically get highest organic reach -- are they being used?",
      "- Check if posts avoid outbound links in body (algorithm penalty)",
      "- Dwell time correlation: do longer posts hold attention?",
      "- Are posts ending with questions to drive discussion?",
      "- A good engagement rate on LinkedIn is 2-5% (above 5% is excellent)",
    ].join("\n"),

    facebook: [
      "Facebook-specific analysis:",
      "- Shares are the MOST valuable metric -- shared content reaches 3-5x more people",
      "- Comment sentiment matters: are comments positive, negative, or questions?",
      "- Do questions/polls drive more engagement than statements?",
      "- Video performance vs static image comparison",
      "- Community-building content vs promotional -- which performs better?",
      "- A good engagement rate on Facebook is 0.5-1% (above 1% is excellent)",
    ].join("\n"),
  };

  return platformSpecific[platform];
}

export async function runPostAnalyserAgent(params: {
  posts: FetchedPost[];
  platform: Platform;
  manifesto: BrandManifesto;
  strategy?: ContentStrategy;
}): Promise<PostAnalysis> {
  const analysisModel = resolveGeminiModel("analysis");
  const analysisThinking = resolveGeminiThinking("analysis", analysisModel);
  const { posts, platform, manifesto, strategy } = params;
  const fallback = createDefaultAnalysis();

  if (posts.length === 0) {
    return fallback;
  }

  const postsForPrompt = posts.map((p) => ({
    content: p.content.slice(0, 500),
    type: p.mediaType ?? "unknown",
    postedAt: p.postedAt,
    impressions: p.impressions,
    reach: p.reach,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves ?? 0,
    clicks: p.clicks ?? 0,
    engagementRate: p.engagementRate,
  }));

  const strategySection = strategy
    ? [
        "Current content strategy:",
        JSON.stringify(strategy, null, 2),
      ]
    : ["No content strategy has been generated yet — skip strategy gap analysis."];

  const generated = await generateJson<PostAnalysis>({
    systemPrompt: [
      "You are the Post Analysis Agent for Conduit, an AI social media manager.",
      `Analyse the company's existing ${platform} posts — both their content AND their performance metrics.`,
      "Identify what's working (high-engagement posts), what's underperforming, and compare against the brand manifesto and content strategy.",
      "Provide data-backed, actionable suggestions. Return valid JSON only.",
    ].join(" "),
    userPrompt: [
      "Use this exact JSON schema shape:",
      JSON.stringify(fallback, null, 2),

      `\nHere are ${posts.length} recent ${platform} posts with their performance metrics:`,
      JSON.stringify(postsForPrompt, null, 2),

      "\nBrand manifesto:",
      JSON.stringify(manifesto, null, 2),

      ...strategySection,

      "\nAnalysis requirements:",
      "",
      buildPlatformAnalysisContext(platform),
      "",
      getPlatformPromptContext(platform),
      "",
      "- Categorise each post by type (educational, promotional, behind-the-scenes, engagement, announcement, etc.)",
      "- Calculate which content types get the MOST and LEAST engagement",
      "- Identify which topics resonate most with the audience, backed by metrics",
      "- Determine the best posting days and times based on engagement correlation",
      "- Pick the top 5 posts by engagement and explain WHY they worked",
      "- Pick the bottom 5 posts by engagement and explain WHY they underperformed",
      "- Compare detected tone and content mix against the brand manifesto voice attributes",
      "- If a content strategy exists, compare posting frequency and content mix against it",
      "- Score overall alignment 0-100 (0 = completely off-brand, 100 = perfectly aligned)",
      "- Provide 3-5 data-backed key insights",
      "- Provide 3-5 actionable recommendations",
      "- Write a 2-3 sentence plain-English summary",
      "\nReturn JSON only.",
    ].join("\n"),
    temperature: 0.3,
    geminiModel: analysisModel,
    geminiThinking: analysisThinking,
    fallback,
  });

  try {
    return postAnalysisSchema.parse(generated);
  } catch (error) {
    console.error("Post Analyser Agent returned invalid output, using fallback:", error);
    return fallback;
  }
}
