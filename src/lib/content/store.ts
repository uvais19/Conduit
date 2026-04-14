import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";
import type {
  ContentDraftRecord,
  GeneratedVariant,
  VariantLabel,
  VisualPlanPersisted,
} from "@/lib/content/types";

export { groupVariants } from "./group-variants";

const draftsByTenant = new Map<string, ContentDraftRecord[]>();

function useDb() {
  return Boolean(process.env.DATABASE_URL);
}

function mapDraftRow(row: typeof contentDrafts.$inferSelect): ContentDraftRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    platform: row.platform,
    pillar: row.pillar ?? "",
    caption: row.caption,
    hashtags: row.hashtags ?? [],
    cta: row.cta ?? "",
    writerRationale: row.writerRationale ?? null,
    campaignId: row.campaignId ?? null,
    mediaUrls: row.mediaUrls ?? [],
    mediaType: row.mediaType,
    carousel: (row.carouselData as ContentDraftRecord["carousel"]) ?? [],
    storyTemplate:
      (row.threadData as ContentDraftRecord["storyTemplate"]) ?? null,
    visualPlanData:
      (row.visualPlanData as VisualPlanPersisted | null | undefined) ?? null,
    status: row.status,
    variantGroup: row.variantGroup ?? row.id,
    variantLabel: (row.variantLabel ?? "A") as VariantLabel,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    platformPostId: row.platformPostId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createDraftsFromVariants({
  tenantId,
  platform,
  pillar,
  variantGroup,
  variants,
  campaignId,
}: {
  tenantId: string;
  platform: Platform;
  pillar: string;
  variantGroup: string;
  variants: GeneratedVariant[];
  campaignId?: string | null;
}): Promise<ContentDraftRecord[]> {
  if (!useDb()) {
    const now = new Date().toISOString();

    const created = variants.map((variant) => ({
      id: randomUUID(),
      tenantId,
      platform,
      pillar,
      caption: variant.caption,
      hashtags: variant.hashtags,
      cta: variant.cta,
      writerRationale: variant.writerRationale ?? null,
      campaignId: campaignId ?? null,
      mediaUrls: [],
      mediaType: "text-only" as const,
      carousel: [],
      storyTemplate: null,
      visualPlanData: null,
      status: "draft" as const,
      variantGroup,
      variantLabel: variant.variantLabel,
      scheduledAt: null,
      publishedAt: null,
      platformPostId: null,
      createdAt: now,
      updatedAt: now,
    }));

    const existing = draftsByTenant.get(tenantId) ?? [];
    draftsByTenant.set(tenantId, [...created, ...existing]);
    return created;
  }

  const [first] = variants;
  const normalizedGroup =
    variantGroup && variantGroup.length > 0
      ? variantGroup
      : randomUUID();

  const rows = await db
    .insert(contentDrafts)
    .values(
      variants.map((variant) => ({
        tenantId,
        platform,
        pillar,
        caption: variant.caption,
        hashtags: variant.hashtags,
        cta: variant.cta,
        writerRationale: variant.writerRationale ?? null,
        campaignId: campaignId ?? null,
        mediaUrls: [] as string[],
        mediaType: "text-only" as const,
        carouselData: [] as unknown[],
        threadData: null,
        visualPlanData: null,
        variantGroup: normalizedGroup,
        variantLabel: variant.variantLabel,
        status: "draft" as const,
      }))
    )
    .returning();

  if (!first) {
    return [];
  }

  return rows.map(mapDraftRow);
}

export async function listDrafts({
  tenantId,
  platform,
  status,
  pillar,
  campaignId,
  unassignedOnly,
}: {
  tenantId: string;
  platform?: Platform;
  status?: ContentDraftRecord["status"];
  pillar?: string;
  campaignId?: string;
  unassignedOnly?: boolean;
}): Promise<ContentDraftRecord[]> {
  if (!useDb()) {
    const drafts = draftsByTenant.get(tenantId) ?? [];

    return drafts.filter((draft) => {
      if (platform && draft.platform !== platform) return false;
      if (status && draft.status !== status) return false;
      if (pillar && draft.pillar.toLowerCase() !== pillar.toLowerCase()) return false;
      if (unassignedOnly && draft.campaignId) return false;
      if (campaignId && draft.campaignId !== campaignId) return false;
      return true;
    });
  }

  const rows = await db
    .select()
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.tenantId, tenantId),
        platform ? eq(contentDrafts.platform, platform) : undefined,
        status ? eq(contentDrafts.status, status) : undefined,
        campaignId ? eq(contentDrafts.campaignId, campaignId) : undefined,
        unassignedOnly ? isNull(contentDrafts.campaignId) : undefined
      )
    )
    .orderBy(desc(contentDrafts.updatedAt));

  const mapped = rows.map(mapDraftRow);

  return mapped.filter((draft) => {
    if (platform && draft.platform !== platform) return false;
    if (status && draft.status !== status) return false;
    if (pillar && draft.pillar.toLowerCase() !== pillar.toLowerCase()) return false;
    if (unassignedOnly && draft.campaignId) return false;
    if (campaignId && draft.campaignId !== campaignId) return false;
    return true;
  });
}

export async function getDraftById(
  tenantId: string,
  id: string
): Promise<ContentDraftRecord | null> {
  if (!useDb()) {
    const drafts = draftsByTenant.get(tenantId) ?? [];
    return drafts.find((draft) => draft.id === id) ?? null;
  }

  const [row] = await db
    .select()
    .from(contentDrafts)
    .where(and(eq(contentDrafts.tenantId, tenantId), eq(contentDrafts.id, id)))
    .limit(1);

  return row ? mapDraftRow(row) : null;
}

export async function updateDraft(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<
      ContentDraftRecord,
      | "caption"
      | "hashtags"
      | "cta"
      | "pillar"
      | "campaignId"
      | "writerRationale"
      | "status"
      | "mediaUrls"
      | "mediaType"
      | "carousel"
      | "storyTemplate"
      | "visualPlanData"
      | "scheduledAt"
      | "publishedAt"
      | "platformPostId"
    >
  >
): Promise<ContentDraftRecord | null> {
  if (!useDb()) {
    const drafts = draftsByTenant.get(tenantId) ?? [];
    const index = drafts.findIndex((draft) => draft.id === id);
    if (index === -1) {
      return null;
    }

    const updated: ContentDraftRecord = {
      ...drafts[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    drafts[index] = updated;
    draftsByTenant.set(tenantId, drafts);
    return updated;
  }

  const [row] = await db
    .update(contentDrafts)
    .set({
      caption: patch.caption,
      hashtags: patch.hashtags,
      cta: patch.cta,
      pillar: patch.pillar,
      campaignId: patch.campaignId,
      writerRationale: patch.writerRationale,
      status: patch.status,
      mediaUrls: patch.mediaUrls,
      mediaType: patch.mediaType,
      carouselData: patch.carousel,
      threadData: patch.storyTemplate,
      visualPlanData: patch.visualPlanData,
      scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt) : undefined,
      publishedAt: patch.publishedAt ? new Date(patch.publishedAt) : undefined,
      platformPostId: patch.platformPostId,
      updatedAt: new Date(),
    })
    .where(and(eq(contentDrafts.tenantId, tenantId), eq(contentDrafts.id, id)))
    .returning();

  return row ? mapDraftRow(row) : null;
}

export async function appendDraftMediaUrl(
  tenantId: string,
  id: string,
  mediaUrl: string,
  mediaType: ContentDraftRecord["mediaType"] = "image"
): Promise<ContentDraftRecord | null> {
  const draft = await getDraftById(tenantId, id);
  if (!draft) {
    return null;
  }

  const deduped = Array.from(new Set([mediaUrl, ...draft.mediaUrls]));
  return await updateDraft(tenantId, id, {
    mediaUrls: deduped,
    mediaType,
  });
}
