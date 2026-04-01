import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { platformType } from "@/lib/types";
import { savePlatformConnection } from "@/lib/platforms/store";

const connectSchema = z.object({
  platform: platformType,
  displayName: z.string().min(1, "Display name is required"),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().default(""),
  platformUserId: z.string().default(""),
  platformPageId: z.string().default(""),
  tokenExpiresAt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const body = await request.json();
    const parsed = connectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const connection = savePlatformConnection({
      tenantId: session.user.tenantId,
      platform: parsed.data.platform,
      displayName: parsed.data.displayName,
      accessToken: parsed.data.accessToken,
      refreshToken: parsed.data.refreshToken,
      platformUserId: parsed.data.platformUserId,
      platformPageId: parsed.data.platformPageId,
      tokenExpiresAt: parsed.data.tokenExpiresAt,
      connectedBy: session.user.id,
    });

    // Return without sensitive tokens
    const { accessToken, refreshToken, ...safe } = connection;
    return NextResponse.json({ connection: safe }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to connect platform:", error);
    return NextResponse.json({ error: "Unable to connect platform" }, { status: 500 });
  }
}
