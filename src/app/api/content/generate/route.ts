import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { generatePlatformVariants } from "@/lib/agents/content/writers";
import { createDraftsFromVariants } from "@/lib/content/store";
import { contentGenerationRequestSchema } from "@/lib/content/types";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("generate_content");
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = contentGenerationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const generated = generatePlatformVariants(parsed.data);
    const drafts = createDraftsFromVariants({
      tenantId,
      platform: parsed.data.platform,
      pillar: parsed.data.pillar,
      variantGroup: generated.variantGroup,
      variants: generated.variants,
    });

    return NextResponse.json({
      variantGroup: generated.variantGroup,
      drafts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to generate content:", error);
    return NextResponse.json(
      { error: "Unable to generate content" },
      { status: 500 }
    );
  }
}
