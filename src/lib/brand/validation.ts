import { desc, eq } from "drizzle-orm";
import type { ContentDraftRecord } from "@/lib/content/types";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import type { BrandManifesto } from "@/lib/types";
import { checkBrandConsistency } from "@/lib/agents/brand/consistency-checker";

export type BrandValidationMode = "warn" | "block";

export type DraftBrandValidationResult = Awaited<ReturnType<typeof checkBrandConsistency>> & {
  mode: BrandValidationMode;
  missingManifesto: boolean;
};

export async function getLatestManifesto(tenantId: string): Promise<BrandManifesto | null> {
  const [row] = await db
    .select({ data: brandManifestos.data })
    .from(brandManifestos)
    .where(eq(brandManifestos.tenantId, tenantId))
    .orderBy(desc(brandManifestos.version))
    .limit(1);
  return row ? (row.data as BrandManifesto) : null;
}

export async function validateDraftAgainstBrand(input: {
  tenantId: string;
  draft: Pick<ContentDraftRecord, "caption" | "hashtags" | "cta" | "platform">;
  mode?: BrandValidationMode;
}): Promise<DraftBrandValidationResult> {
  const mode = input.mode ?? "warn";
  const manifesto = await getLatestManifesto(input.tenantId);
  if (!manifesto) {
    return {
      overallScore: 0,
      toneScore: 0,
      messageAlignmentScore: 0,
      guidelinesScore: 0,
      issues: [],
      strengths: [],
      summary: "Brand manifesto missing for this tenant.",
      score: {
        overallScore: 0,
        toneScore: 0,
        messageAlignmentScore: 0,
        guidelinesScore: 0,
        source: "fallback",
        computedAt: new Date().toISOString(),
      },
      compliance: {
        blockingErrors: [],
        warnings: [],
        infos: [],
        missingDisclosures: [],
        autoFixSuggestions: [],
        canProceed: mode !== "block",
      },
      mode,
      missingManifesto: true,
    };
  }

  const result = await checkBrandConsistency({
    caption: input.draft.caption,
    hashtags: input.draft.hashtags,
    cta: input.draft.cta,
    platform: input.draft.platform,
    manifesto,
  });

  return {
    ...result,
    mode,
    missingManifesto: false,
    compliance: {
      ...result.compliance,
      canProceed: mode === "block" ? result.compliance.canProceed : true,
    },
  };
}
