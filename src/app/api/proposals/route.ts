import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listProposals } from "@/lib/optimization/store";
import { runOptimizerAgent } from "@/lib/agents/optimization/optimizer-agent";
import { getAnalyses } from "@/lib/platforms/post-store";
import { db } from "@/lib/db";
import { contentStrategies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ContentStrategy } from "@/lib/types";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const proposals = await listProposals(tenantId);

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    // Fetch strategy and analyses to provide context to the optimizer
    const [strategyRows, analysisRows] = await Promise.all([
      db
        .select({ data: contentStrategies.data })
        .from(contentStrategies)
        .where(eq(contentStrategies.tenantId, tenantId))
        .orderBy(desc(contentStrategies.createdAt), desc(contentStrategies.id))
        .limit(1),
      getAnalyses(tenantId),
    ]);

    const strategy = strategyRows[0]?.data as ContentStrategy | undefined;
    const postAnalyses = analysisRows.map((r) => r.data);

    const newProposals = await runOptimizerAgent(tenantId, {
      postAnalyses: postAnalyses.length > 0 ? postAnalyses : undefined,
      strategy: strategy ?? undefined,
    });

    return NextResponse.json({ proposals: newProposals });
  } catch (error) {
    console.error("Failed to generate proposals:", error);
    return NextResponse.json(
      { error: "Failed to generate optimization proposals" },
      { status: 500 }
    );
  }
}
