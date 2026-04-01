import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { platformType } from "@/lib/types";
import { disconnectPlatform } from "@/lib/platforms/store";

const disconnectSchema = z.object({
  platform: platformType,
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const body = await request.json();
    const parsed = disconnectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const removed = disconnectPlatform(session.user.tenantId, parsed.data.platform);
    if (!removed) {
      return NextResponse.json({ error: "Platform not connected" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to disconnect platform:", error);
    return NextResponse.json({ error: "Unable to disconnect platform" }, { status: 500 });
  }
}
