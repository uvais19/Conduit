import { randomUUID } from "crypto";
import type { Platform } from "@/lib/types";
import type {
  ContentDraftRecord,
  GeneratedVariant,
  VariantLabel,
} from "@/lib/content/types";

const draftsByTenant = new Map<string, ContentDraftRecord[]>();

export function createDraftsFromVariants({
  tenantId,
  platform,
  pillar,
  variantGroup,
  variants,
}: {
  tenantId: string;
  platform: Platform;
  pillar: string;
  variantGroup: string;
  variants: GeneratedVariant[];
}): ContentDraftRecord[] {
  const now = new Date().toISOString();

  const created = variants.map((variant) => ({
    id: randomUUID(),
    tenantId,
    platform,
    pillar,
    caption: variant.caption,
    hashtags: variant.hashtags,
    cta: variant.cta,
    status: "draft" as const,
    variantGroup,
    variantLabel: variant.variantLabel,
    createdAt: now,
    updatedAt: now,
  }));

  const existing = draftsByTenant.get(tenantId) ?? [];
  draftsByTenant.set(tenantId, [...created, ...existing]);
  return created;
}

export function listDrafts({
  tenantId,
  platform,
  status,
  pillar,
}: {
  tenantId: string;
  platform?: Platform;
  status?: ContentDraftRecord["status"];
  pillar?: string;
}): ContentDraftRecord[] {
  const drafts = draftsByTenant.get(tenantId) ?? [];

  return drafts.filter((draft) => {
    if (platform && draft.platform !== platform) return false;
    if (status && draft.status !== status) return false;
    if (pillar && draft.pillar.toLowerCase() !== pillar.toLowerCase()) return false;
    return true;
  });
}

export function getDraftById(tenantId: string, id: string): ContentDraftRecord | null {
  const drafts = draftsByTenant.get(tenantId) ?? [];
  return drafts.find((draft) => draft.id === id) ?? null;
}

export function updateDraft(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<
      ContentDraftRecord,
      "caption" | "hashtags" | "cta" | "pillar" | "status"
    >
  >
): ContentDraftRecord | null {
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

export function groupVariants(drafts: ContentDraftRecord[]) {
  const groups = new Map<string, ContentDraftRecord[]>();

  for (const draft of drafts) {
    const existing = groups.get(draft.variantGroup) ?? [];
    existing.push(draft);
    groups.set(draft.variantGroup, existing);
  }

  return Array.from(groups.entries()).map(([variantGroup, groupDrafts]) => ({
    variantGroup,
    platform: groupDrafts[0]?.platform,
    pillar: groupDrafts[0]?.pillar,
    createdAt: groupDrafts[0]?.createdAt,
    variants: (["A", "B", "C"] as VariantLabel[])
      .map((label) => groupDrafts.find((item) => item.variantLabel === label))
      .filter(Boolean),
  }));
}
