import { NextResponse } from "next/server";
import {
  processScheduledPosts,
  getQueueStatsAsync,
  getRecentJobsAsync,
} from "@/lib/jobs/queue";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST: Trigger processing of scheduled posts (called by cron).
 * GET: Return queue stats and recent jobs.
 */
export async function POST(request: Request) {
  const limited = rateLimitResponse("cron-publish", { limit: 5, windowSeconds: 60 });
  if (limited) return limited;

  const secret = process.env.CRON_JOB_SECRET;
  if (secret) {
    const token = request.headers.get("x-cron-secret");
    if (!token || token !== secret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }
  }

  try {
    const processed = await processScheduledPosts();
    const stats = await getQueueStatsAsync();
    return NextResponse.json({ processed, stats });
  } catch {
    return NextResponse.json(
      { error: "Failed to process scheduled posts" },
      { status: 500 }
    );
  }
}

export async function GET() {
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
