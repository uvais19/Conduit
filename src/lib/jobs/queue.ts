/**
 * Background job queue for scheduled publishing and recurring tasks.
 * This is a lightweight in-process implementation.
 * In production, replace with a proper queue (BullMQ, Inngest, etc.).
 */

import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { logActivity } from "@/lib/audit-log";
import { getPlatformConnection } from "@/lib/platforms/store";
import { publishDraft, simulatePublish } from "@/lib/agents/publishing/publisher";
import type { ContentDraftRecord } from "@/lib/content/types";
import { refreshConnectionToken } from "@/lib/platforms/token-lifecycle";
import type { Platform } from "@/lib/types";

export type JobType =
  | "publish_scheduled"
  | "collect_analytics"
  | "send_digest"
  | "refresh_platform_tokens";

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
  completedAt?: Date;
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

type TokenRefreshPayload = {
  tenantId: string;
  platform: Platform;
};

export function enqueueTokenRefreshJob(payload: TokenRefreshPayload): Job {
  return enqueueJob("refresh_platform_tokens", payload);
}

export async function processTokenRefreshJobs(maxJobs = 100): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pending = jobQueue
    .filter((job) => job.type === "refresh_platform_tokens" && job.status === "pending")
    .slice(0, maxJobs);
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  for (const job of pending) {
    processed += 1;
    job.status = "running";
    job.attempts += 1;
    const payload = job.payload as Partial<TokenRefreshPayload>;
    const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : "";
    const platform = payload.platform as Platform | undefined;
    if (!tenantId || !platform) {
      job.status = "failed";
      job.lastError = "Invalid refresh job payload";
      failed += 1;
      continue;
    }
    const connection = getPlatformConnection(tenantId, platform);
    if (!connection) {
      job.status = "completed";
      job.completedAt = new Date();
      continue;
    }
    const refreshed = await refreshConnectionToken(connection);
    if (refreshed.ok) {
      job.status = "completed";
      job.lastError = undefined;
      job.completedAt = new Date();
      succeeded += 1;
    } else if (job.attempts < job.maxAttempts) {
      job.status = "pending";
      job.lastError = refreshed.error;
      const backoffMs = Math.min(300_000, 1000 * 2 ** job.attempts);
      job.scheduledAt = new Date(Date.now() + backoffMs);
    } else {
      job.status = "failed";
      job.lastError = refreshed.error;
      job.completedAt = new Date();
      failed += 1;
    }
  }
  return { processed, succeeded, failed };
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

      const mappedDraft = {
        ...draft,
        scheduledAt: draft.scheduledAt?.toISOString() ?? null,
        publishedAt: draft.publishedAt?.toISOString() ?? null,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
        hashtags: draft.hashtags ?? [],
        mediaUrls: draft.mediaUrls ?? [],
        pillar: draft.pillar ?? "",
        cta: draft.cta ?? "",
        platformPostId: draft.platformPostId ?? null,
      } as unknown as ContentDraftRecord;
      const connection = getPlatformConnection(draft.tenantId, draft.platform);
      const publishResult = connection
        ? await publishDraft(mappedDraft, connection)
        : await simulatePublish(mappedDraft);
      if (!publishResult.success) {
        throw new Error(publishResult.error ?? "Scheduled publish failed");
      }

      await db
        .update(contentDrafts)
        .set({
          status: "published",
          publishedAt: new Date(publishResult.publishedAt),
          platformPostId: publishResult.platformPostId,
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
