import { generateJson } from "@/lib/ai/clients";
import { createProposal } from "@/lib/optimization/store";
import { getDashboardOverview, getTrendData } from "@/lib/analytics/store";
import type { ProposalType, OptimizationProposal } from "@/lib/optimization/types";

type RawProposal = {
  proposalType: ProposalType;
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
];

export async function runOptimizerAgent(
  tenantId: string
): Promise<OptimizationProposal[]> {
  const overview = getDashboardOverview(tenantId);
  const trends = getTrendData(tenantId, 30);

  const fallback: RawProposal[] = [];

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
      "",
      "Proposal types allowed: pillar_change, schedule_change, tone_change, format_change",
      "",
      "Each proposal must have these fields:",
      '- proposalType: one of the allowed types',
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

  const created: OptimizationProposal[] = [];
  for (const p of validProposals) {
    created.push(
      createProposal({
        tenantId,
        proposalType: p.proposalType,
        title: p.title,
        description: p.description,
        reasoning: p.reasoning,
        data: p.data ?? {},
      })
    );
  }

  return created;
}
