import { generateJson } from "@/lib/ai/clients";
import { getMultiPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import { createProposal } from "@/lib/optimization/store";
import { getDashboardOverview, getTrendData } from "@/lib/analytics/store";
import { randomUUID } from "crypto";
import type {
  OptimizationProposal,
  OptimizationProposalPayload,
  ProposalImpactProjection,
  ProposalOperation,
  ProposalType,
} from "@/lib/optimization/types";
import type { ContentStrategy, Platform, PostAnalysis } from "@/lib/types";

type RawProposal = {
  proposalType: ProposalType;
  platform?: Platform;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
  operations?: Array<{
    field: string;
    from?: string | number | boolean | null;
    to: string | number | boolean | null;
    reason: string;
  }>;
  impactProjection?: {
    metric: string;
    baseline: number;
    projectedDelta: number;
    projectedValue: number;
    confidence: number;
    evaluationWindowDays: number;
    downsideRisk: string;
  };
};

const VALID_TYPES: ProposalType[] = [
  "pillar_change",
  "schedule_change",
  "tone_change",
  "format_change",
  "platform_format_shift",
];

function normalizeOperation(
  op: NonNullable<RawProposal["operations"]>[number],
  index: number
): ProposalOperation {
  return {
    id: randomUUID(),
    field: op.field?.trim() || `change_${index + 1}`,
    from: op.from,
    to: op.to,
    reason: op.reason?.trim() || "Proposed optimization change",
    status: "pending",
    resolvedAt: null,
    resolvedBy: null,
  };
}

function normalizeProjection(
  value: RawProposal["impactProjection"]
): ProposalImpactProjection | undefined {
  if (!value) return undefined;
  if (!value.metric || Number.isNaN(Number(value.baseline))) return undefined;
  return {
    metric: value.metric,
    baseline: Number(value.baseline),
    projectedDelta: Number(value.projectedDelta ?? 0),
    projectedValue: Number(value.projectedValue ?? 0),
    confidence: Math.max(0, Math.min(1, Number(value.confidence ?? 0.5))),
    evaluationWindowDays: Math.max(1, Number(value.evaluationWindowDays ?? 14)),
    downsideRisk: value.downsideRisk ?? "Low confidence due to limited sample size",
  };
}

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
      '- operations: array of granular field-level changes with { field, from, to, reason }',
      '- impactProjection: { metric, baseline, projectedDelta, projectedValue, confidence(0-1), evaluationWindowDays, downsideRisk }',
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
      {
        const operations = (p.operations ?? [])
          .filter((op) => op && op.field && op.reason)
          .map(normalizeOperation);

        const data: OptimizationProposalPayload = {
          operations,
          impactProjection: normalizeProjection(p.impactProjection),
          legacyData: p.data ?? {},
        };

        return createProposal({
          tenantId,
          proposalType: p.proposalType,
          title: p.title,
          description: p.description,
          reasoning: p.reasoning,
          data,
        });
      }
    )
  );

  return created;
}
