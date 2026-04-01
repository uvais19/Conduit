import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { appendDraftMediaUrl } from "@/lib/content/store";
import { mediaTypeSchema } from "@/lib/content/types";

const payloadSchema = z.object({
  mediaUrl: z.string().min(1),
  mediaType: mediaTypeSchema.default("image"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("edit_drafts");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await appendDraftMediaUrl(
      tenantId,
      id,
      parsed.data.mediaUrl,
      parsed.data.mediaType
    );

    if (!updated) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to link media:", error);
    return NextResponse.json({ error: "Unable to link media" }, { status: 500 });
  }
}
