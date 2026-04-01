import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  competitorProfiles,
  optimizationProposals,
} from "@/lib/db/schema";
import type {
  CompetitorAnalysis,
  CompetitorProfile,
  DiscoveryMethod,
  OptimizationProposal,
  ProposalStatus,
  ProposalType,
} from "./types";
import type { Platform } from "@/lib/types";

const proposalsByTenant = new Map<string, OptimizationProposal[]>();
const competitorsByTenant = new Map<string, CompetitorProfile[]>();

function useDb() {
  return Boolean(process.env.DATABASE_URL);
}

function mapProposalRow(row: typeof optimizationProposals.$inferSelect): OptimizationProposal {
  return {
    id: row.id,
    tenantId: row.tenantId,
    proposalType: row.proposalType,
    title: row.title,
    description: row.description,
    reasoning: row.reasoning ?? "",
    data: (row.data as Record<string, unknown>) ?? {},
    status: row.status,
    proposedAt: row.proposedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolvedBy: row.resolvedBy,
  };
}

function mapCompetitorRow(row: typeof competitorProfiles.$inferSelect): CompetitorProfile {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    platform: row.platform,
    profileUrl: row.profileUrl ?? "",
    discoveryMethod: row.discoveryMethod,
    lastAnalyzedAt: row.lastAnalyzedAt ? row.lastAnalyzedAt.toISOString() : null,
    analysisData: (row.analysisData as CompetitorAnalysis | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createProposal(params: {
  tenantId: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
}): Promise<OptimizationProposal> {
  if (!useDb()) {
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

  const [created] = await db
    .insert(optimizationProposals)
    .values({
      tenantId: params.tenantId,
      proposalType: params.proposalType,
      title: params.title,
      description: params.description,
      reasoning: params.reasoning,
      data: params.data,
      status: "pending",
    })
    .returning();

  return mapProposalRow(created);
}

export async function listProposals(
  tenantId: string,
  status?: ProposalStatus
): Promise<OptimizationProposal[]> {
  if (!useDb()) {
    const all = proposalsByTenant.get(tenantId) ?? [];
    return status ? all.filter((p) => p.status === status) : all;
  }

  const rows = await db
    .select()
    .from(optimizationProposals)
    .where(
      status
        ? and(
            eq(optimizationProposals.tenantId, tenantId),
            eq(optimizationProposals.status, status)
          )
        : eq(optimizationProposals.tenantId, tenantId)
    )
    .orderBy(desc(optimizationProposals.proposedAt));

  return rows.map(mapProposalRow);
}

export async function getProposalById(
  tenantId: string,
  proposalId: string
): Promise<OptimizationProposal | null> {
  if (!useDb()) {
    const all = proposalsByTenant.get(tenantId) ?? [];
    return all.find((p) => p.id === proposalId) ?? null;
  }

  const [row] = await db
    .select()
    .from(optimizationProposals)
    .where(
      and(
        eq(optimizationProposals.tenantId, tenantId),
        eq(optimizationProposals.id, proposalId)
      )
    )
    .limit(1);

  return row ? mapProposalRow(row) : null;
}

export async function resolveProposal(
  tenantId: string,
  proposalId: string,
  action: "approved" | "rejected",
  resolvedBy: string
): Promise<OptimizationProposal | null> {
  if (!useDb()) {
    const all = proposalsByTenant.get(tenantId) ?? [];
    const proposal = all.find((p) => p.id === proposalId);
    if (!proposal || proposal.status !== "pending") return null;

    proposal.status = action;
    proposal.resolvedAt = new Date().toISOString();
    proposal.resolvedBy = resolvedBy;
    return proposal;
  }

  const [existing] = await db
    .select()
    .from(optimizationProposals)
    .where(
      and(
        eq(optimizationProposals.tenantId, tenantId),
        eq(optimizationProposals.id, proposalId)
      )
    )
    .limit(1);

  if (!existing || existing.status !== "pending") {
    return null;
  }

  const [updated] = await db
    .update(optimizationProposals)
    .set({
      status: action,
      resolvedAt: new Date(),
      resolvedBy,
    })
    .where(
      and(
        eq(optimizationProposals.tenantId, tenantId),
        eq(optimizationProposals.id, proposalId)
      )
    )
    .returning();

  return updated ? mapProposalRow(updated) : null;
}

export async function addCompetitor(params: {
  tenantId: string;
  name: string;
  platform: Platform;
  profileUrl: string;
  discoveryMethod: DiscoveryMethod;
  analysisData?: CompetitorAnalysis | null;
}): Promise<CompetitorProfile> {
  if (!useDb()) {
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

  const [created] = await db
    .insert(competitorProfiles)
    .values({
      tenantId: params.tenantId,
      name: params.name,
      platform: params.platform,
      profileUrl: params.profileUrl,
      discoveryMethod: params.discoveryMethod,
      lastAnalyzedAt: params.analysisData ? new Date() : null,
      analysisData: params.analysisData ?? null,
    })
    .returning();

  return mapCompetitorRow(created);
}

export async function listCompetitors(tenantId: string): Promise<CompetitorProfile[]> {
  if (!useDb()) {
    return competitorsByTenant.get(tenantId) ?? [];
  }

  const rows = await db
    .select()
    .from(competitorProfiles)
    .where(eq(competitorProfiles.tenantId, tenantId))
    .orderBy(desc(competitorProfiles.createdAt));

  return rows.map(mapCompetitorRow);
}

export async function getCompetitorById(
  tenantId: string,
  competitorId: string
): Promise<CompetitorProfile | null> {
  if (!useDb()) {
    const all = competitorsByTenant.get(tenantId) ?? [];
    return all.find((c) => c.id === competitorId) ?? null;
  }

  const [row] = await db
    .select()
    .from(competitorProfiles)
    .where(
      and(
        eq(competitorProfiles.tenantId, tenantId),
        eq(competitorProfiles.id, competitorId)
      )
    )
    .limit(1);

  return row ? mapCompetitorRow(row) : null;
}

export async function updateCompetitorAnalysis(
  tenantId: string,
  competitorId: string,
  analysisData: CompetitorAnalysis
): Promise<CompetitorProfile | null> {
  if (!useDb()) {
    const all = competitorsByTenant.get(tenantId) ?? [];
    const competitor = all.find((c) => c.id === competitorId);
    if (!competitor) return null;

    competitor.analysisData = analysisData;
    competitor.lastAnalyzedAt = new Date().toISOString();
    return competitor;
  }

  const [updated] = await db
    .update(competitorProfiles)
    .set({
      analysisData,
      lastAnalyzedAt: new Date(),
    })
    .where(
      and(
        eq(competitorProfiles.tenantId, tenantId),
        eq(competitorProfiles.id, competitorId)
      )
    )
    .returning();

  return updated ? mapCompetitorRow(updated) : null;
}
