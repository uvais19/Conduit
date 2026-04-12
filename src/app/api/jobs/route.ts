import { NextResponse } from "next/server";
import { processScheduledPosts, getQueueStats, getRecentJobs } from "@/lib/jobs/queue";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST: Trigger processing of scheduled posts (called by cron).
 * GET: Return queue stats and recent jobs.
 */
export async function POST() {
  const limited = rateLimitResponse("cron-publish", { limit: 5, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const processed = await processScheduledPosts();
    const stats = getQueueStats();
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
    const stats = getQueueStats();
    const recentJobs = getRecentJobs();
    return NextResponse.json({ stats, recentJobs });
  } catch {
    return NextResponse.json(
      { error: "Failed to load queue stats" },
      { status: 500 }
    );
  }
}
