import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, contentDrafts } from "@/lib/db/schema";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { enqueue } from "@/lib/agents/publishing/scheduler";
import { recordAuditEvent } from "@/lib/content/audit";
import type { CampaignRecord } from "@/lib/content/types";

function mapCampaign(row: typeof campaigns.$inferSelect): CampaignRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCampaigns(tenantId: string): Promise<CampaignRecord[]> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.tenantId, tenantId))
    .orderBy(desc(campaigns.updatedAt));
  return rows.map(mapCampaign);
}

export async function createCampaign(
  tenantId: string,
  input: { name: string; description?: string | null }
): Promise<CampaignRecord> {
  const [row] = await db
    .insert(campaigns)
    .values({
      tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .returning();
  return mapCampaign(row!);
}

export async function getCampaignForTenant(
  tenantId: string,
  campaignId: string
): Promise<CampaignRecord | null> {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
    .limit(1);
  return row ? mapCampaign(row) : null;
}

/** Alias for API routes that follow `getCampaignById` naming. */
export const getCampaignById = getCampaignForTenant;

export async function updateCampaign(
  tenantId: string,
  id: string,
  patch: { name?: string; description?: string | null }
): Promise<CampaignRecord | null> {
  const [row] = await db
    .update(campaigns)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id)))
    .returning();

  return row ? mapCampaign(row) : null;
}

export async function deleteCampaign(tenantId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id)));

  return (result.rowCount ?? 0) > 0;
}

/** Assign drafts to a campaign (tenant must own drafts and campaign). */
export async function assignDraftsToCampaign(
  tenantId: string,
  campaignId: string,
  draftIds: string[]
): Promise<number> {
  const campaign = await getCampaignForTenant(tenantId, campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const result = await db
    .update(contentDrafts)
    .set({ campaignId, updatedAt: new Date() })
    .where(and(eq(contentDrafts.tenantId, tenantId), inArray(contentDrafts.id, draftIds)));

  return result.rowCount ?? draftIds.length;
}

/** Schedule each approved draft in the campaign at staggered times (hours between posts). */
export async function scheduleApprovedCampaignDrafts(params: {
  tenantId: string;
  campaignId: string;
  actorId: string;
  actorName: string;
  startAt: Date;
  hoursBetween: number;
}): Promise<{ scheduled: string[]; skipped: string[] }> {
  const { tenantId, campaignId, actorId, actorName, startAt, hoursBetween } = params;
  const rows = await db
    .select()
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.tenantId, tenantId),
        eq(contentDrafts.campaignId, campaignId),
        eq(contentDrafts.status, "approved")
      )
    );

  const scheduled: string[] = [];
  const skipped: string[] = [];
  let slot = new Date(startAt);

  for (const row of rows) {
    const draft = await getDraftById(tenantId, row.id);
    if (!draft || draft.status !== "approved") {
      skipped.push(row.id);
      continue;
    }

    const scheduledAt = slot.toISOString();
    const updated = await updateDraft(tenantId, row.id, {
      status: "scheduled",
      scheduledAt,
    });

    if (!updated) {
      skipped.push(row.id);
      slot = new Date(slot.getTime() + hoursBetween * 60 * 60 * 1000);
      continue;
    }

    enqueue({
      draftId: row.id,
      tenantId,
      platform: draft.platform,
      scheduledAt,
    });
    recordAuditEvent({
      draftId: row.id,
      tenantId,
      action: "submit",
      actorId,
      actorName,
      fromStatus: "approved",
      toStatus: "scheduled",
      notes: `Campaign batch schedule for ${scheduledAt}`,
    });
    scheduled.push(row.id);

    slot = new Date(slot.getTime() + hoursBetween * 60 * 60 * 1000);
  }

  return { scheduled, skipped };
}
