import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PLATFORMS } from "@/lib/constants";
import { getPlatformConnection } from "@/lib/platforms/store";
import { refreshConnectionToken } from "@/lib/platforms/token-lifecycle";

function shouldRefreshSoon(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false;
  const ms = new Date(tokenExpiresAt).getTime() - Date.now();
  return ms <= 1000 * 60 * 60 * 24 * 7;
}

export async function POST() {
  try {
    const session = await requirePermission("connect_platforms");
    const tenantId = session.user.tenantId;

    const results: Array<{ platform: string; ok: boolean; error?: string }> = [];
    for (const platform of PLATFORMS) {
      const connection = getPlatformConnection(tenantId, platform);
      if (!connection) continue;
      if (!shouldRefreshSoon(connection.tokenExpiresAt)) continue;
      const refreshed = await refreshConnectionToken(connection);
      if (refreshed.ok) {
        results.push({ platform, ok: true });
      } else {
        results.push({ platform, ok: false, error: refreshed.error });
      }
    }

    return NextResponse.json({ refreshed: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to refresh tokens" }, { status: 500 });
  }
}
