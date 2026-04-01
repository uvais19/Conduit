import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  discoveryInputSchema,
  runDiscoveryPipeline,
} from "@/lib/agents/discovery";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = discoveryInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid onboarding input" },
        { status: 400 }
      );
    }

    const result = await runDiscoveryPipeline(parsed.data);

    const [latestManifesto] = await db
      .select({ version: brandManifestos.version })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    const [saved] = await db
      .insert(brandManifestos)
      .values({
        tenantId,
        data: result.manifesto,
        version: (latestManifesto?.version ?? 0) + 1,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      manifesto: saved.data,
      version: saved.version,
      scraper: result.scraper,
      documents: result.documents,
    });
  } catch (error) {
    console.error("Discovery pipeline failed:", error);
    return NextResponse.json(
      { error: "Unable to run discovery pipeline" },
      { status: 500 }
    );
  }
}
