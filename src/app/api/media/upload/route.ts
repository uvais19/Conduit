import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { appendDraftMediaUrl, getDraftById } from "@/lib/content/store";
import { uploadFile } from "@/lib/storage/r2";

function canUseR2(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("edit_drafts");
    const tenantId = session.user.tenantId;
    const formData = await request.formData();
    const draftId = String(formData.get("draftId") || "");
    const file = formData.get("file");

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const draft = await getDraftById(tenantId, draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop() || "png";
    const key = `${tenantId}/uploads/${randomUUID()}.${extension}`;

    const imageUrl = canUseR2()
      ? await uploadFile(key, buffer, file.type || "application/octet-stream")
      : `local-preview://${key}`;

    const updated = await appendDraftMediaUrl(tenantId, draftId, imageUrl, "image");

    return NextResponse.json({ imageUrl, draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to upload media:", error);
    return NextResponse.json({ error: "Unable to upload media" }, { status: 500 });
  }
}
