import { NextResponse } from "next/server";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/jobs/cron-auth";
import { processScheduledPosts, processTokenRefreshJobs } from "@/lib/jobs/queue";
import { processWebhookJobs } from "@/lib/platforms/webhook-events";

export async function GET(request: Request) {
  const authResult = authorizeCron(request);
  if (authResult !== "ok") return cronUnauthorizedResponse(authResult);

  try {
    const published = await processScheduledPosts();
    const refreshed = await processTokenRefreshJobs();
    const webhooks = await processWebhookJobs();
    return NextResponse.json({ published, refreshed, webhooks });
  } catch {
    return NextResponse.json({ error: "Cron run failed" }, { status: 500 });
  }
}
