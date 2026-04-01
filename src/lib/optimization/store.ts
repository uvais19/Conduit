import { randomUUID } from "crypto";
import type {
  OptimizationProposal,
  ProposalType,
  ProposalStatus,
  CompetitorProfile,
  DiscoveryMethod,
  CompetitorAnalysis,
} from "./types";
import type { Platform } from "@/lib/types";

// ---------------------------------------------------------------------------
// In-memory optimization proposals store (keyed by tenantId)
// ---------------------------------------------------------------------------

const proposalsByTenant = new Map<string, OptimizationProposal[]>();

export function createProposal(params: {
  tenantId: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
}): OptimizationProposal {
  const proposal: OptimizationProposal = {
    id: randomUUID(),
    tenantId: params.tenantId,
    proposalType: params.proposalType,
    title: params.title,
    description: params.description,
    reasoning: params.reasoning,
    data: params.data,
    status: "pending",
    proposedAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };

  const existing = proposalsByTenant.get(params.tenantId) ?? [];
  proposalsByTenant.set(params.tenantId, [proposal, ...existing]);
  return proposal;
}

export function listProposals(
  tenantId: string,
  status?: ProposalStatus
): OptimizationProposal[] {
  const all = proposalsByTenant.get(tenantId) ?? [];
  if (!status) return all;
  return all.filter((p) => p.status === status);
}

export function getProposalById(
  tenantId: string,
  proposalId: string
): OptimizationProposal | null {
  const all = proposalsByTenant.get(tenantId) ?? [];
  return all.find((p) => p.id === proposalId) ?? null;
}

export function resolveProposal(
  tenantId: string,
  proposalId: string,
  action: "approved" | "rejected",
  resolvedBy: string
): OptimizationProposal | null {
  const all = proposalsByTenant.get(tenantId) ?? [];
  const proposal = all.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending") return null;

  proposal.status = action;
  proposal.resolvedAt = new Date().toISOString();
  proposal.resolvedBy = resolvedBy;
  return proposal;
}

// ---------------------------------------------------------------------------
// In-memory competitor profiles store (keyed by tenantId)
// ---------------------------------------------------------------------------

const competitorsByTenant = new Map<string, CompetitorProfile[]>();

export function addCompetitor(params: {
  tenantId: string;
  name: string;
  platform: Platform;
  profileUrl: string;
  discoveryMethod: DiscoveryMethod;
  analysisData?: CompetitorAnalysis | null;
}): CompetitorProfile {
  const profile: CompetitorProfile = {
    id: randomUUID(),
    tenantId: params.tenantId,
    name: params.name,
    platform: params.platform,
    profileUrl: params.profileUrl,
    discoveryMethod: params.discoveryMethod,
    lastAnalyzedAt: params.analysisData ? new Date().toISOString() : null,
    analysisData: params.analysisData ?? null,
    createdAt: new Date().toISOString(),
  };

  const existing = competitorsByTenant.get(params.tenantId) ?? [];
  competitorsByTenant.set(params.tenantId, [profile, ...existing]);
  return profile;
}

export function listCompetitors(tenantId: string): CompetitorProfile[] {
  return competitorsByTenant.get(tenantId) ?? [];
}

export function getCompetitorById(
  tenantId: string,
  competitorId: string
): CompetitorProfile | null {
  const all = competitorsByTenant.get(tenantId) ?? [];
  return all.find((c) => c.id === competitorId) ?? null;
}

export function updateCompetitorAnalysis(
  tenantId: string,
  competitorId: string,
  analysisData: CompetitorAnalysis
): CompetitorProfile | null {
  const all = competitorsByTenant.get(tenantId) ?? [];
  const competitor = all.find((c) => c.id === competitorId);
  if (!competitor) return null;

  competitor.analysisData = analysisData;
  competitor.lastAnalyzedAt = new Date().toISOString();
  return competitor;
}
