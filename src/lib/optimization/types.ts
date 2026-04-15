import type { Platform } from "@/lib/types";

export type ProposalType =
  | "pillar_change"
  | "schedule_change"
  | "tone_change"
  | "format_change"
  | "platform_format_shift";

export type ProposalStatus = "pending" | "approved" | "rejected";

export type ProposalOperationStatus = "pending" | "approved" | "rejected";

export type ProposalOperation = {
  id: string;
  field: string;
  from?: string | number | boolean | null;
  to: string | number | boolean | null;
  reason: string;
  status: ProposalOperationStatus;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

export type ProposalImpactProjection = {
  metric: string;
  baseline: number;
  projectedDelta: number;
  projectedValue: number;
  confidence: number;
  evaluationWindowDays: number;
  downsideRisk: string;
};

export type OptimizationProposalPayload = {
  operations: ProposalOperation[];
  impactProjection?: ProposalImpactProjection;
  legacyData?: Record<string, unknown>;
};

export type OptimizationProposal = {
  id: string;
  tenantId: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  reasoning: string;
  data: OptimizationProposalPayload;
  status: ProposalStatus;
  proposedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type DiscoveryMethod = "ai-discovered" | "manual";

export type CompetitorProfile = {
  id: string;
  tenantId: string;
  name: string;
  platform: Platform;
  profileUrl: string;
  discoveryMethod: DiscoveryMethod;
  lastAnalyzedAt: string | null;
  analysisData: CompetitorAnalysis | null;
  createdAt: string;
};

export type CompetitorAnalysis = {
  postingFrequency: string;
  schedulePatterns: string;
  contentTypes: string[];
  engagementRate: number;
  hashtagStrategy: string[];
  topThemes: string[];
  summary: string;
};
