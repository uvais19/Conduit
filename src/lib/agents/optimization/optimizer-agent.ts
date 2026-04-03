import { generateJson } from "@/lib/ai/clients";
import { getMultiPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import { createProposal } from "@/lib/optimization/store";
import { getDashboardOverview, getTrendData } from "@/lib/analytics/store";
import type { ProposalType, OptimizationProposal } from "@/lib/optimization/types";
import type { ContentStrategy, Platform, PostAnalysis } from "@/lib/types";

type RawProposal = {
  proposalType: ProposalType;
  platform?: Platform;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
};

const VALID_TYPES: ProposalType[] = [
  "pillar_change",
  "schedule_change",
  "tone_change",
  "format_change",
  "platform_format_shift",
];

export async function runOptimizerAgent(
  tenantId: string,
  options?: {
    postAnalyses?: PostAnalysis[];
    strategy?: ContentStrategy;
  }
): Promise<OptimizationProposal[]> {
  const overview = await getDashboardOverview(tenantId);
  const trends = await getTrendData(tenantId, 30);

  const fallback: RawProposal[] = [];

  const strategyContext = options?.strategy
    ? [
        "",
        "Current content strategy:",
        JSON.stringify(options.strategy, null, 2),
      ]
    : [];

  const analysisContext = options?.postAnalyses?.length
    ? [
        "",
        "Post analysis insights per platform:",
        JSON.stringify(options.postAnalyses, null, 2),
      ]
    : [];

  const proposals = await generateJson<RawProposal[]>({
    systemPrompt: [
      "You are the Optimizer Agent for Conduit, an AI social media manager.",
      "Analyze the provided analytics data and generate actionable optimization proposals.",
      "Each proposal should have clear reasoning backed by the data.",
      "Only generate proposals where you see a meaningful pattern or opportunity.",
      "Return a JSON array of proposals (may be empty if no clear optimizations exist).",
    ].join(" "),
    userPrompt: [
      "Analytics overview:",
      JSON.stringify(overview, null, 2),
      "",
      "Recent trends (last 30 days):",
      JSON.stringify(trends, null, 2),
      ...strategyContext,
      ...analysisContext,
      "",
      "Platform-specific optimization knowledge:",
      getMultiPlatformPromptContext(["instagram", "facebook", "linkedin", "x", "gbp"]),
      "",
      "Proposal types allowed: pillar_change, schedule_change, tone_change, format_change, platform_format_shift",
      "",
      "Each proposal must have these fields:",
      '- proposalType: one of the allowed types',
      '- platform: (optional) which platform this targets',
      '- title: short descriptive title',
      '- description: what should change and how',
      '- reasoning: data-backed justification',
      '- data: object with specific proposed changes (e.g. { from: "20%", to: "35%", pillar: "Customer Stories" })',
      "",
      "Return JSON array only. Return [] if data is insufficient.",
    ].join("\n"),
    temperature: 0.3,
    fallback,
  });

  const validProposals = (Array.isArray(proposals) ? proposals : [])
    .filter(
      (p) =>
        p.proposalType &&
        VALID_TYPES.includes(p.proposalType) &&
        p.title &&
        p.description &&
        p.reasoning
    );

  const created = await Promise.all(
    validProposals.map((p) =>
      createProposal({
        tenantId,
        proposalType: p.proposalType,
        title: p.title,
        description: p.description,
        reasoning: p.reasoning,
        data: p.data ?? {},
      })
    )
  );

  return created;
}
