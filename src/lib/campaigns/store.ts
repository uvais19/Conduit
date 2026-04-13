import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, contentDrafts } from "@/lib/db/schema";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { enqueue } from "@/lib/agents/publishing/scheduler";
import { recordAuditEvent } from "@/lib/content/audit";

export type CampaignRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: string;
};

function mapCampaign(row: typeof campaigns.$inferSelect): CampaignRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCampaigns(tenantId: string): Promise<CampaignRecord[]> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.tenantId, tenantId))
    .orderBy(desc(campaigns.createdAt));
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
