import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  discoveryInputSchema,
  runDiscoveryPipeline,
  type DiscoveryProgressEvent,
} from "@/lib/agents/discovery";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import { safeParseBrandManifestoFromPartial } from "@/lib/brand/manifesto";
import { normalizeOnboardingWebsiteUrl } from "@/lib/onboarding/url";

function progressPayload(event: DiscoveryProgressEvent) {
  return {
    step: event.phase,
    message: event.message,
    ...(event.source !== undefined ? { source: event.source } : {}),
    ...(event.documentCount !== undefined ? { documentCount: event.documentCount } : {}),
  };
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const userId = session.user.id;
    const body = await request.json();
    const parsed = discoveryInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid onboarding input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const result = await runDiscoveryPipeline(input, (progressEvent) => {
            send("progress", progressPayload(progressEvent));
          });

          const [latestManifesto] = await db
            .select({ version: brandManifestos.version })
            .from(brandManifestos)
            .where(eq(brandManifestos.tenantId, tenantId))
            .orderBy(desc(brandManifestos.createdAt))
            .limit(1);

          const normalizedSite = input.websiteUrl?.trim()
            ? normalizeOnboardingWebsiteUrl(input.websiteUrl)
            : "";
          const withSite = normalizedSite
            ? safeParseBrandManifestoFromPartial({
                ...result.manifesto,
                websiteUrl: normalizedSite,
              })
            : null;
          const manifestoToSave =
            withSite?.success ? withSite.data : result.manifesto;

          const [saved] = await db
            .insert(brandManifestos)
            .values({
              tenantId,
              data: manifestoToSave,
              version: (latestManifesto?.version ?? 0) + 1,
              createdBy: userId,
            })
            .returning();

          send("done", {
            manifesto: saved.data,
            version: saved.version,
            scraper: result.scraper,
            documents: result.documents,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to run discovery pipeline";
          console.error("Discovery pipeline failed:", error);
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
    console.error("Discovery route failed:", error);
    return NextResponse.json(
      { error: "Unable to start discovery pipeline" },
      { status: 500 }
    );
  }
}
