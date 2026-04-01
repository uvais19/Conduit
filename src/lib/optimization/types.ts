import type { Platform } from "@/lib/types";

export type ProposalType =
  | "pillar_change"
  | "schedule_change"
  | "tone_change"
  | "format_change";

export type ProposalStatus = "pending" | "approved" | "rejected";

export type OptimizationProposal = {
  id: string;
  tenantId: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
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
