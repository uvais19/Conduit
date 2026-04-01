import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { runStrategyAgent } from "@/lib/agents/strategy";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos, contentStrategies } from "@/lib/db/schema";

export async function POST() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

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

    const strategy = await runStrategyAgent(latestManifesto.data as never);

    const [latestStrategy] = await db
      .select({ version: contentStrategies.version })
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt))
      .limit(1);

    const [saved] = await db
      .insert(contentStrategies)
      .values({
        tenantId,
        data: strategy,
        version: (latestStrategy?.version ?? 0) + 1,
        status: "active",
      })
      .returning();

    return NextResponse.json({
      strategy: saved.data,
      version: saved.version,
      status: saved.status,
    });
  } catch (error) {
    console.error("Strategy generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate content strategy" },
      { status: 500 }
    );
  }
}
