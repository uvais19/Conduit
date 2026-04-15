import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PLATFORMS } from "@/lib/constants";
import { getPlatformConnection } from "@/lib/platforms/store";
import { enqueueTokenRefreshJob, processTokenRefreshJobs } from "@/lib/jobs/queue";
import { listTenantIdsWithPlatformConnections } from "@/lib/platforms/store";

function shouldRefreshSoon(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false;
  const ms = new Date(tokenExpiresAt).getTime() - Date.now();
  return ms <= 1000 * 60 * 60 * 24 * 7;
}

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_JOB_SECRET;
  if (!secret) return false;
  const token = request.headers.get("x-cron-secret");
  return Boolean(token && token === secret);
}

export async function POST(request: Request) {
  try {
    const cronRequest = isAuthorizedCronRequest(request);
    const session = cronRequest ? null : await requirePermission("connect_platforms");
    const tenantId = session?.user.tenantId;

    const results: Array<{ tenantId: string; platform: string; enqueued: boolean }> = [];
    const tenantIds = tenantId ? [tenantId] : listTenantIdsWithPlatformConnections();
    for (const targetTenantId of tenantIds) {
      for (const platform of PLATFORMS) {
        const connection = getPlatformConnection(targetTenantId, platform);
        if (!connection) continue;
        if (!shouldRefreshSoon(connection.tokenExpiresAt)) continue;
        enqueueTokenRefreshJob({ tenantId: targetTenantId, platform });
        results.push({ tenantId: targetTenantId, platform, enqueued: true });
      }
    }
    const processed = await processTokenRefreshJobs();

    return NextResponse.json({
      refreshed: results,
      queue: processed,
      triggeredBy: cronRequest ? "cron" : "user",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to refresh tokens" }, { status: 500 });
  }
}
