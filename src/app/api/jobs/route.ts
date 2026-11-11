import { NextResponse } from "next/server";
import {
  processScheduledPosts,
  getQueueStatsAsync,
  getRecentJobsAsync,
  processTokenRefreshJobs,
} from "@/lib/jobs/queue";
import { rateLimitResponse } from "@/lib/rate-limit";
import { processWebhookJobs } from "@/lib/platforms/webhook-events";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/jobs/cron-auth";

/**
 * POST: Trigger processing of scheduled posts (called by cron).
 * GET: Return queue stats and recent jobs.
 */
export async function POST(request: Request) {
  const authResult = authorizeCron(request);
  if (authResult !== "ok") return cronUnauthorizedResponse(authResult);

  const limited = rateLimitResponse("cron-publish", { limit: 5, windowSeconds: 60 });
  if (limited) return limited;
  const jobKind = new URL(request.url).searchParams.get("kind") ?? "publish";

  try {
    const processed =
      jobKind === "token-refresh"
        ? await processTokenRefreshJobs()
        : jobKind === "webhooks"
          ? await processWebhookJobs()
          : await processScheduledPosts();
    const stats = await getQueueStatsAsync();
    return NextResponse.json({ processed, stats });
  } catch {
    return NextResponse.json(
      { error: "Failed to process scheduled posts" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authResult = authorizeCron(request);
  if (authResult !== "ok") return cronUnauthorizedResponse(authResult);

  const queueLimited = rateLimitResponse("queue-stats", { limit: 30, windowSeconds: 60 });
  if (queueLimited) return queueLimited;

  try {
    const stats = await getQueueStatsAsync();
    const recentJobs = await getRecentJobsAsync();
    return NextResponse.json({ stats, recentJobs });
  } catch {
    return NextResponse.json(
      { error: "Failed to load queue stats" },
      { status: 500 }
    );
  }
}
