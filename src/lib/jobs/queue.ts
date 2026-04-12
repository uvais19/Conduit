/**
 * Background job queue for scheduled publishing and recurring tasks.
 * This is a lightweight in-process implementation.
 * In production, replace with a proper queue (BullMQ, Inngest, etc.).
 */

import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { logActivity } from "@/lib/audit-log";

export type JobType = "publish_scheduled" | "collect_analytics" | "send_digest";

interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  scheduledAt: Date;
  status: "pending" | "running" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
}

// In-memory queue for the stub implementation
const jobQueue: Job[] = [];

export function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  scheduledAt?: Date
): Job {
  const job: Job = {
    id: crypto.randomUUID(),
    type,
    payload,
    scheduledAt: scheduledAt ?? new Date(),
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
  };
  jobQueue.push(job);
  return job;
}

export function getQueueStats(): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
} {
  return {
    pending: jobQueue.filter((j) => j.status === "pending").length,
    running: jobQueue.filter((j) => j.status === "running").length,
    completed: jobQueue.filter((j) => j.status === "completed").length,
    failed: jobQueue.filter((j) => j.status === "failed").length,
    total: jobQueue.length,
  };
}

export function getRecentJobs(limit = 20): Job[] {
  return [...jobQueue]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Process due scheduled posts. Called by a cron endpoint or scheduler.
 * Returns the number of posts processed.
 */
export async function processScheduledPosts(): Promise<number> {
  const now = new Date();

  // Find all scheduled drafts that are due
  const dueDrafts = await db
    .select()
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.status, "scheduled"),
        lte(contentDrafts.scheduledAt, now)
      )
    )
    .limit(50);

  let processed = 0;

  for (const draft of dueDrafts) {
    const job = enqueueJob("publish_scheduled", {
      draftId: draft.id,
      tenantId: draft.tenantId,
      platform: draft.platform,
    });

    try {
      job.status = "running";
      job.attempts++;

      // In a real implementation, this would call the platform API
      // For now, mark as published
      await db
        .update(contentDrafts)
        .set({
          status: "published",
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(contentDrafts.id, draft.id));

      job.status = "completed";
      processed++;

      try {
        await logActivity({
          tenantId: draft.tenantId,
          userId: "system",
          action: "draft.published",
          resourceType: "draft",
          resourceId: draft.id,
          metadata: { platform: draft.platform, automated: true },
        });
      } catch {
        // Non-critical
      }
    } catch (err) {
      job.status = job.attempts >= job.maxAttempts ? "failed" : "pending";
      job.lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return processed;
}
