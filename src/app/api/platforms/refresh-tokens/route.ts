import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { processTokenRefreshJobs } from "@/lib/jobs/queue";
import { authorizeCron } from "@/lib/jobs/cron-auth";

export async function POST(request: Request) {
  try {
    const cronRequest = authorizeCron(request) === "ok";
    const session = cronRequest ? null : await requirePermission("connect_platforms");
    const queue = await processTokenRefreshJobs({
      tenantId: session?.user.tenantId,
    });

    return NextResponse.json({
      refreshed: queue.refreshed,
      queue,
      triggeredBy: cronRequest ? "cron" : "user",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to refresh tokens" }, { status: 500 });
  }
}
