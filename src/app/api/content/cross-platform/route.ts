import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftById } from "@/lib/content/store";
import { createDraftsFromVariants } from "@/lib/content/store";
import { runCrossPlatformAgent } from "@/lib/agents/content/cross-platform-agent";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import { z } from "zod";
import { platformType } from "@/lib/types";
import type { BrandManifesto, Platform } from "@/lib/types";

const requestSchema = z.object({
  draftId: z.string().min(1),
  targetPlatforms: z.array(platformType).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const draft = await getDraftById(tenantId, parsed.data.draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const [manifestoRow] = await db
      .select({ data: brandManifestos.data })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    if (!manifestoRow?.data) {
      return NextResponse.json(
        { error: "Brand manifesto not found." },
        { status: 400 }
      );
    }

    const adaptations = await runCrossPlatformAgent({
      caption: draft.caption,
      sourcePlatform: draft.platform,
      targetPlatforms: parsed.data.targetPlatforms as Platform[],
      manifesto: manifestoRow.data as BrandManifesto,
      pillar: draft.pillar,
      topic: draft.caption.slice(0, 100),
    });

    // Create drafts for each adapted platform
    const allDrafts = [];
    for (const [platform, adaptation] of Object.entries(adaptations)) {
      const drafts = await createDraftsFromVariants({
        tenantId,
        platform: platform as Platform,
        pillar: draft.pillar,
        variantGroup: draft.variantGroup,
        variants: [
          {
            variantLabel: draft.variantLabel,
            caption: adaptation.caption,
            hashtags: adaptation.hashtags,
            cta: adaptation.cta,
          },
        ],
      });
      allDrafts.push(...drafts);
    }

    return NextResponse.json({ drafts: allDrafts, adaptations });
  } catch (error) {
    console.error("Cross-platform rewrite failed:", error);
    return NextResponse.json(
      { error: "Unable to adapt content for other platforms" },
      { status: 500 }
    );
  }
}
