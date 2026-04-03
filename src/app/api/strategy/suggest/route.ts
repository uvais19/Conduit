import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { runStrategySuggestAgent } from "@/lib/agents/strategy/strategy-suggest-agent";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos, contentStrategies, platformAnalyses } from "@/lib/db/schema";
import type { PostAnalysis } from "@/lib/types";

const requestSchema = z.object({
  section: z.enum(["pillars", "schedule", "weeklyThemes"]),
  currentStrategy: z.object({
    pillars: z.array(z.any()),
    schedule: z.array(z.any()),
    weeklyThemes: z.array(z.any()),
    monthlyGoals: z.array(z.any()),
  }),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { section, currentStrategy } = parsed.data;

    const [latestManifesto] = await db
      .select()
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    if (!latestManifesto?.data) {
      return NextResponse.json(
        { error: "Complete onboarding first so Conduit has a Brand Manifesto to work from." },
        { status: 400 }
      );
    }

    const manifesto = latestManifesto.data as Record<string, unknown>;

    const [savedStrategy] = await db
      .select({ data: contentStrategies.data })
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt))
      .limit(1);

    const analysisRows = await db
      .select({ data: platformAnalyses.data })
      .from(platformAnalyses)
      .where(eq(platformAnalyses.tenantId, tenantId));

    const postAnalyses = analysisRows.length > 0
      ? analysisRows.map((r) => r.data as PostAnalysis)
      : undefined;

    const result = await runStrategySuggestAgent({
      section,
      currentStrategy,
      manifesto,
      savedStrategy: savedStrategy?.data as Record<string, unknown> | undefined,
      postAnalyses,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Strategy suggest failed:", error);
    return NextResponse.json(
      { error: "Unable to generate suggestions" },
      { status: 500 }
    );
  }
}
