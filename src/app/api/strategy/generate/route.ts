import { desc, eq } from "drizzle-orm";
import { runStrategyAgent } from "@/lib/agents/strategy";
import { getCompetitorInsightsForStrategy } from "@/lib/agents/competitors/competitor-agent";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos, contentStrategies, platformAnalyses } from "@/lib/db/schema";
import type { PostAnalysis } from "@/lib/types";

const STRATEGY_COMPETITOR_TIMEOUT_MS = 15_000;

function makeRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function logInfo(requestId: string, message: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[strategy/generate:${requestId}] ${message}`, details);
    return;
  }
  console.info(`[strategy/generate:${requestId}] ${message}`);
}

function logError(
  requestId: string,
  message: string,
  error: unknown,
  details?: Record<string, unknown>
) {
  if (details) {
    console.error(`[strategy/generate:${requestId}] ${message}`, { error, ...details });
    return;
  }
  console.error(`[strategy/generate:${requestId}] ${message}`, error);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function POST() {
  try {
    const requestId = makeRequestId();
    const requestStartedAt = Date.now();
    logInfo(requestId, "request started");

    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    logInfo(requestId, "auth resolved", { elapsedMs: elapsedMs(requestStartedAt), tenantId });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ` + JSON.stringify(data) + "\n\n")
          );
        };

        try {
          const streamStartedAt = Date.now();
          logInfo(requestId, "stream started");
          send("progress", { step: "loading", message: "Loading brand manifesto..." });

          const manifestoStartedAt = Date.now();
          const [latestManifesto] = await db
            .select()
            .from(brandManifestos)
            .where(eq(brandManifestos.tenantId, tenantId))
            .orderBy(desc(brandManifestos.createdAt))
            .limit(1);
          logInfo(requestId, "brand manifesto query finished", {
            elapsedMs: elapsedMs(manifestoStartedAt),
            found: Boolean(latestManifesto?.data),
          });

          if (!latestManifesto?.data) {
            send("error", { error: "Complete onboarding first so Conduit has a Brand Manifesto to work from." });
            logInfo(requestId, "aborted: brand manifesto missing", {
              totalElapsedMs: elapsedMs(streamStartedAt),
            });
            controller.close();
            return;
          }

          send("progress", { step: "analysing", message: "Fetching post analyses..." });

          const parallelStartedAt = Date.now();
          logInfo(requestId, "starting parallel analysis + competitor fetch");

          const postAnalysesPromise = (async () => {
            const analysesStartedAt = Date.now();
            const analysisRows = await db
              .select({ data: platformAnalyses.data })
              .from(platformAnalyses)
              .where(eq(platformAnalyses.tenantId, tenantId));

            const postAnalyses = analysisRows.length > 0
              ? analysisRows.map((r) => r.data as PostAnalysis)
              : undefined;
            logInfo(requestId, "post analyses fetched", {
              elapsedMs: elapsedMs(analysesStartedAt),
              count: analysisRows.length,
            });
            return postAnalyses;
          })();

          const competitorInsightsPromise = (async () => {
            const competitorsStartedAt = Date.now();
            try {
              const insights = await withTimeout(
                getCompetitorInsightsForStrategy(tenantId),
                STRATEGY_COMPETITOR_TIMEOUT_MS,
                "Competitor insights"
              );
              logInfo(requestId, "competitor insights fetched", {
                elapsedMs: elapsedMs(competitorsStartedAt),
              });
              return insights;
            } catch (error) {
              logError(
                requestId,
                "competitor insights failed, continuing without them",
                error,
                {
                  elapsedMs: elapsedMs(competitorsStartedAt),
                }
              );
              return undefined;
            }
          })();

          const [postAnalyses, competitorInsights] = await Promise.all([
            postAnalysesPromise,
            competitorInsightsPromise,
          ]);
          logInfo(requestId, "parallel fetch complete", {
            elapsedMs: elapsedMs(parallelStartedAt),
          });

          send("progress", { step: "generating", message: "Generating AI strategy..." });

          const strategyStartedAt = Date.now();
          const strategy = await runStrategyAgent(
            latestManifesto.data as never,
            postAnalyses,
            undefined,
            competitorInsights
          );
          logInfo(requestId, "strategy agent finished", {
            elapsedMs: elapsedMs(strategyStartedAt),
          });

          send("progress", { step: "saving", message: "Saving strategy..." });

          const saveStartedAt = Date.now();
          const [latestStrategy] = await db
            .select({ version: contentStrategies.version })
            .from(contentStrategies)
            .where(eq(contentStrategies.tenantId, tenantId))
            .orderBy(desc(contentStrategies.createdAt), desc(contentStrategies.id))
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
          logInfo(requestId, "strategy saved", {
            elapsedMs: elapsedMs(saveStartedAt),
            version: saved.version,
          });

          send("done", {
            strategy: saved.data,
            version: saved.version,
            status: saved.status,
          });
          logInfo(requestId, "request completed", {
            totalElapsedMs: elapsedMs(streamStartedAt),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Strategy generation failed";
          logError(requestId, "request failed inside stream", error);
          send("error", { error: message });
        } finally {
          controller.close();
          logInfo(requestId, "stream closed");
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
    console.error("Strategy generation failed before stream setup:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate content strategy" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
