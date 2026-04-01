import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { appendDraftMediaUrl, getDraftById } from "@/lib/content/store";
import {
  imageGenerateRequestSchema,
  mediaTypeSchema,
} from "@/lib/content/types";
import { generateImageAsset } from "@/lib/content/image-generation";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("edit_drafts");
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = imageGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const draft = await getDraftById(tenantId, parsed.data.draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const generated = await generateImageAsset({
      tenantId,
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspectRatio,
    });

    const updated = await appendDraftMediaUrl(
      tenantId,
      draft.id,
      generated.imageUrl,
      mediaTypeSchema.enum.image
    );

    return NextResponse.json({
      imageUrl: generated.imageUrl,
      provider: generated.provider,
      prompt: generated.prompt,
      draft: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to generate image:", error);
    return NextResponse.json({ error: "Unable to generate image" }, { status: 500 });
  }
}
