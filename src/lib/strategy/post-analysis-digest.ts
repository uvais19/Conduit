import type { PostAnalysis } from "@/lib/types";

const MAX_INSIGHTS = 5;
const MAX_GAPS = 6;

/**
 * Summarises platform post analyses for strategy prompts (bounded size).
 */
export function buildPostAnalysisDigest(analyses: PostAnalysis[] | undefined): string {
  if (!analyses?.length) return "";

  const blocks: string[] = [];
  for (let i = 0; i < analyses.length; i += 1) {
    const a = analyses[i];
    const parts: string[] = [];
    parts.push(`### Analysis block ${i + 1}`);
    parts.push(
      `Posting: ${a.postingFrequency.postsPerWeek}/week; peak day ${a.postingFrequency.mostActiveDay} @ ${a.postingFrequency.mostActiveTime}`
    );
    parts.push(
      `Engagement summary: avg rate ${(a.engagementSummary.avgEngagementRate * 100).toFixed(2)}%; reach ${a.engagementSummary.totalReach}; best type ${a.engagementSummary.bestPostType}; weakest ${a.engagementSummary.worstPostType}`
    );
    if (a.contentMix?.length) {
      parts.push(
        `Observed mix: ${a.contentMix.map((c) => `${c.type} ${c.percentage}%`).join(", ")}`
      );
    }
    if (a.keyInsights?.length) {
      parts.push(
        `Key insights:\n${a.keyInsights.slice(0, MAX_INSIGHTS).map((k) => `- ${k}`).join("\n")}`
      );
    }
    if (a.recommendations?.length) {
      parts.push(
        `Recommendations:\n${a.recommendations.slice(0, MAX_INSIGHTS).map((k) => `- ${k}`).join("\n")}`
      );
    }
    if (a.gapsVsStrategy?.length) {
      parts.push(
        `Gaps vs prior strategy:\n${a.gapsVsStrategy
          .slice(0, MAX_GAPS)
          .map((g) => `- ${g.area}: ${g.suggestion}`)
          .join("\n")}`
      );
    }
    if (a.gapsVsManifesto?.length) {
      parts.push(
        `Gaps vs manifesto:\n${a.gapsVsManifesto
          .slice(0, MAX_GAPS)
          .map((g) => `- ${g.area}: ${g.suggestion}`)
          .join("\n")}`
      );
    }
    parts.push(`Score: ${a.overallScore}/100 — ${a.summary.slice(0, 400)}`);
    blocks.push(parts.join("\n"));
  }

  return `## Historical performance (connected platforms)\n\n${blocks.join("\n\n")}`;
}
