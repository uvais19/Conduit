import type { ContentDraftRecord, VariantLabel } from "@/lib/content/types";

export type VariantDraftGroup = {
  variantGroup: string;
  platform: ContentDraftRecord["platform"] | undefined;
  pillar: string | undefined;
  createdAt: string | undefined;
  variants: ContentDraftRecord[];
};

export function groupVariants(drafts: ContentDraftRecord[]): VariantDraftGroup[] {
  const groups = new Map<string, ContentDraftRecord[]>();

  for (const draft of drafts) {
    const existing = groups.get(draft.variantGroup) ?? [];
    existing.push(draft);
    groups.set(draft.variantGroup, existing);
  }

  return Array.from(groups.entries()).map(([variantGroup, groupDrafts]) => {
    const variants: ContentDraftRecord[] = [];
    for (const label of ["A", "B", "C"] as VariantLabel[]) {
      const found = groupDrafts.find((item) => item.variantLabel === label);
      if (found) variants.push(found);
    }
    return {
      variantGroup,
      platform: groupDrafts[0]?.platform,
      pillar: groupDrafts[0]?.pillar,
      createdAt: groupDrafts[0]?.createdAt,
      variants,
    };
  });
}

export function sortVariantGroupsByRecent(groups: VariantDraftGroup[]): VariantDraftGroup[] {
  return [...groups].sort((a, b) => {
    const aTime = Math.max(
      0,
      ...a.variants.map((v) => new Date(v.updatedAt).getTime())
    );
    const bTime = Math.max(
      0,
      ...b.variants.map((v) => new Date(v.updatedAt).getTime())
    );
    return bTime - aTime;
  });
}
