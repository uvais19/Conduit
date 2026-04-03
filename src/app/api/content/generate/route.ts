import { requirePermission } from "@/lib/auth/permissions";
import { runPlatformWriterAgent } from "@/lib/agents/content/writers";
import { createDraftsFromVariants } from "@/lib/content/store";
import { contentGenerationRequestSchema } from "@/lib/content/types";
import type { VariantLabel, GeneratedVariant } from "@/lib/content/types";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("generate_content");
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = contentGenerationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input = parsed.data;
    const labels: VariantLabel[] = input.generateVariants ? ["A", "B", "C"] : ["A"];
    const variantGroup = crypto.randomUUID();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const variants: GeneratedVariant[] = [];

          for (const label of labels) {
            send("progress", { variant: label, status: "generating" });
            const variant = await runPlatformWriterAgent(input, label);
            variants.push(variant);
            send("variant", variant);
          }

          const drafts = await createDraftsFromVariants({
            tenantId,
            platform: input.platform,
            pillar: input.pillar,
            variantGroup,
            variants,
          });

          send("done", { variantGroup, drafts });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Generation failed";
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
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (message === "Forbidden") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Failed to generate content:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
