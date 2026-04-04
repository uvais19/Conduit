import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { resolveSafeLocalMediaPath } from "@/lib/storage/local-media";

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Serves files from `.conduit-local-media/`. Uses query `key` (full storage path)
 * so the pathname has no file extension — the proxy matcher was skipping
 * `/api/media/local/.../file.svg` and breaking Clerk session for `<img>` requests.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get("key");
    if (!rawKey?.trim()) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const storageKey = decodeURIComponent(rawKey.trim());
    if (!storageKey.startsWith(`${tenantId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filePath = resolveSafeLocalMediaPath(storageKey);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": guessContentType(filePath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("Failed to serve local media:", error);
    return NextResponse.json({ error: "Unable to load media" }, { status: 500 });
  }
}
