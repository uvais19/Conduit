import { desc, eq } from "drizzle-orm";
import { runStrategyAgent } from "@/lib/agents/strategy";
import { getCompetitorInsightsForStrategy } from "@/lib/agents/competitors/competitor-agent";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos, contentStrategies, platformAnalyses } from "@/lib/db/schema";
import type { PostAnalysis } from "@/lib/types";

export async function POST() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          send("progress", { step: "loading", message: "Loading brand manifesto..." });

          const [latestManifesto] = await db
            .select()
            .from(brandManifestos)
            .where(eq(brandManifestos.tenantId, tenantId))
            .orderBy(desc(brandManifestos.createdAt))
            .limit(1);

          if (!latestManifesto?.data) {
            send("error", { error: "Complete onboarding first so Conduit has a Brand Manifesto to work from." });
            controller.close();
            return;
          }

          send("progress", { step: "analysing", message: "Fetching post analyses..." });

          const analysisRows = await db
            .select({ data: platformAnalyses.data })
            .from(platformAnalyses)
            .where(eq(platformAnalyses.tenantId, tenantId));

          const postAnalyses = analysisRows.length > 0
            ? analysisRows.map((r) => r.data as PostAnalysis)
            : undefined;

          send("progress", { step: "generating", message: "Generating AI strategy..." });

          const competitorInsights = await getCompetitorInsightsForStrategy(tenantId);

          const strategy = await runStrategyAgent(
            latestManifesto.data as never,
            postAnalyses,
            undefined,
            competitorInsights
          );

          send("progress", { step: "saving", message: "Saving strategy..." });

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

          send("done", {
            strategy: saved.data,
            version: saved.version,
            status: saved.status,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Strategy generation failed";
          send("error", { error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Strategy generation failed:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate content strategy" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
