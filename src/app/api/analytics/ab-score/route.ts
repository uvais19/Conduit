import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { runABScoringAgent } from "@/lib/agents/content/ab-scoring-agent";
import { saveVariantLearning } from "@/lib/content/variant-learnings";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import { z } from "zod";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto, Platform } from "@/lib/types";

const requestSchema = z.object({
  variants: z.array(
    z.object({
      id: z.string(),
      tenantId: z.string(),
      platform: z.string(),
      pillar: z.string(),
      caption: z.string(),
      hashtags: z.array(z.string()),
      cta: z.string(),
      mediaUrls: z.array(z.string()),
      mediaType: z.string(),
      carousel: z.array(z.unknown()),
      storyTemplate: z.unknown().nullable(),
      status: z.string(),
      variantGroup: z.string(),
      variantLabel: z.enum(["A", "B", "C"]),
      scheduledAt: z.string().nullable(),
      publishedAt: z.string().nullable(),
      platformPostId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      analytics: z.record(z.string(), z.number()).optional(),
    })
  ),
  platform: z.string(),
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

    const result = await runABScoringAgent({
      variants: parsed.data.variants as Array<ContentDraftRecord & { analytics?: Record<string, number> }>,
      platform: parsed.data.platform as Platform,
      manifesto: manifestoRow.data as BrandManifesto,
    });

    // Save the learning
    if (result.learnedPreference) {
      await saveVariantLearning({
        tenantId,
        platform: result.learnedPreference.platform,
        winningAngle: result.learnedPreference.winningAngle,
        margin: result.learnedPreference.margin,
        sampleSize: parsed.data.variants.length,
      });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("A/B scoring failed:", error);
    return NextResponse.json(
      { error: "Unable to score variants" },
      { status: 500 }
    );
  }
}
