import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { uploadedDocuments } from "@/lib/db/schema";
import { uploadFile } from "@/lib/storage/r2";

function resolveFileType(fileName: string, mimeType: string): "pdf" | "docx" | "image" {
  const lowerName = fileName.toLowerCase();
  if (mimeType.includes("image") || /\.(png|jpg|jpeg|webp|gif|svg)$/.test(lowerName)) {
    return "image";
  }
  if (mimeType.includes("word") || lowerName.endsWith(".docx")) {
    return "docx";
  }
  return "pdf";
}

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
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const formData = await request.formData();
    const file = formData.get("file");
    const notes = String(formData.get("notes") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const fileType = resolveFileType(file.name, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${tenantId}/documents/${crypto.randomUUID()}-${file.name}`;

    const fileUrl = canUseR2()
      ? await uploadFile(key, buffer, file.type || "application/octet-stream")
      : `local-preview://${key}`;

    const extractedText = file.type.startsWith("text/")
      ? buffer.toString("utf8").slice(0, 5000)
      : undefined;

    const [savedDocument] = await db
      .insert(uploadedDocuments)
      .values({
        tenantId,
        fileName: file.name,
        fileUrl,
        fileType,
        processed: Boolean(extractedText),
        extractedData: {
          notes,
          mimeType: file.type,
          size: file.size,
          extractedText,
          storedInR2: canUseR2(),
        },
        uploadedBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      document: {
        id: savedDocument.id,
        fileName: savedDocument.fileName,
        fileType: savedDocument.fileType,
        fileUrl: savedDocument.fileUrl,
        notes,
        extractedText,
      },
    });
  } catch (error) {
    console.error("Document upload failed:", error);
    return NextResponse.json(
      { error: "Unable to upload document" },
      { status: 500 }
    );
  }
}
