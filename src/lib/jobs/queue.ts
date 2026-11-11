/**
 * Background job queue for scheduled publishing and recurring tasks.
 * This is a lightweight in-process implementation.
 * In production, replace with a proper queue (BullMQ, Inngest, etc.).
 */

import { db } from "@/lib/db";
import { contentDrafts, platformConnections, publishJobs } from "@/lib/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { logActivity } from "@/lib/audit-log";
import { getPlatformConnection } from "@/lib/platforms/store";
import { publishDraft } from "@/lib/agents/publishing/publisher";
import { decidePublishBranch } from "@/lib/agents/publishing/publish-decision";
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
const MAX_RECENT_JOBS = 200;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

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
  if (hasDatabase()) {
    // DB-backed stats are returned by getQueueStatsAsync().
    return {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };
  }

  return {
    pending: jobQueue.filter((j) => j.status === "pending").length,
    running: jobQueue.filter((j) => j.status === "running").length,
    completed: jobQueue.filter((j) => j.status === "completed").length,
    failed: jobQueue.filter((j) => j.status === "failed").length,
    total: jobQueue.length,
  };
}

export async function getQueueStatsAsync(): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}> {
  if (!hasDatabase()) {
    return getQueueStats();
  }

  const rows = await db
    .select({
      status: publishJobs.status,
    })
    .from(publishJobs)
    .orderBy(desc(publishJobs.createdAt))
    .limit(MAX_RECENT_JOBS);

  const stats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: rows.length,
  };

  for (const row of rows) {
    if (row.status === "pending") stats.pending++;
    if (row.status === "running") stats.running++;
    if (row.status === "completed") stats.completed++;
    if (row.status === "failed") stats.failed++;
  }

  return stats;
}

export function getRecentJobs(limit = 20): Job[] {
  return [...jobQueue]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function getRecentJobsAsync(limit = 20): Promise<Job[]> {
  if (!hasDatabase()) {
    return getRecentJobs(limit);
  }

  const rows = await db
    .select()
    .from(publishJobs)
    .orderBy(desc(publishJobs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: "publish_scheduled" as const,
    payload: {
      draftId: row.draftId,
      tenantId: row.tenantId,
    },
    scheduledAt: row.scheduledFor,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt,
  }));
}

type TokenRefreshPayload = {
  tenantId: string;
  platform: Platform;
};

export function enqueueTokenRefreshJob(payload: TokenRefreshPayload): Job {
  return enqueueJob("refresh_platform_tokens", payload);
}

const TOKEN_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

export async function processTokenRefreshJobs(options?: {
  tenantId?: string;
  maxJobs?: number;
}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  refreshed: Array<{ tenantId: string; platform: string; ok: boolean }>;
}> {
  const empty = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    refreshed: [] as Array<{ tenantId: string; platform: string; ok: boolean }>,
  };
  if (!hasDatabase()) return empty;

  const maxJobs = options?.maxJobs ?? 100;
  const horizon = new Date(Date.now() + TOKEN_REFRESH_WINDOW_MS);
  const dueBefore = lte(platformConnections.tokenExpiresAt, horizon);
  const whereClause = options?.tenantId
    ? and(dueBefore, eq(platformConnections.tenantId, options.tenantId))
    : dueBefore;

  const due = await db
    .select({
      tenantId: platformConnections.tenantId,
      platform: platformConnections.platform,
    })
    .from(platformConnections)
    .where(whereClause)
    .limit(maxJobs);

  let succeeded = 0;
  let failed = 0;
  const refreshed: Array<{ tenantId: string; platform: string; ok: boolean }> = [];
  for (const row of due) {
    try {
      const connection = await getPlatformConnection(row.tenantId, row.platform);
      if (!connection) continue;
      const result = await refreshConnectionToken(connection);
      refreshed.push({ tenantId: row.tenantId, platform: row.platform, ok: result.ok });
      if (result.ok) succeeded += 1;
      else failed += 1;
    } catch {
      failed += 1;
      refreshed.push({ tenantId: row.tenantId, platform: row.platform, ok: false });
    }
  }

  return { processed: refreshed.length, succeeded, failed, refreshed };
}

/**
 * Process due scheduled posts. Called by a cron endpoint or scheduler.
 * Returns the number of posts processed.
 */
export async function processScheduledPosts(): Promise<number> {
  if (!hasDatabase()) {
    return 0;
  }

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
    const connection = await getPlatformConnection(draft.tenantId, draft.platform);
    const decision = decidePublishBranch(connection);
    if (decision.kind === "blocked") {
      const lastError = "Platform is not connected";
      const [existing] = await db
        .select({ id: publishJobs.id })
        .from(publishJobs)
        .where(
          and(
            eq(publishJobs.draftId, draft.id),
            eq(publishJobs.status, "failed"),
            eq(publishJobs.lastError, lastError)
          )
        )
        .limit(1);
      if (existing) {
        await db
          .update(publishJobs)
          .set({ lastError, updatedAt: now })
          .where(eq(publishJobs.id, existing.id));
      } else {
        await db.insert(publishJobs).values({
          tenantId: draft.tenantId,
          draftId: draft.id,
          status: "failed",
          attempts: 1,
          maxAttempts: 3,
          scheduledFor: draft.scheduledAt ?? now,
          lastError,
          metadata: {
            platform: draft.platform,
            source: "cron",
          },
          updatedAt: now,
        });
      }
      continue;
    }

    const [job] = await db
      .insert(publishJobs)
      .values({
        tenantId: draft.tenantId,
        draftId: draft.id,
        status: "running",
        attempts: 1,
        maxAttempts: 3,
        scheduledFor: draft.scheduledAt ?? now,
        startedAt: now,
        metadata: {
          platform: draft.platform,
          source: "cron",
        },
        updatedAt: now,
      })
      .returning();

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
      const publishResult = await publishDraft(mappedDraft, decision.connection);
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

      await db
        .update(publishJobs)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(publishJobs.id, job.id));
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
      const lastError = err instanceof Error ? err.message : "Unknown error";
      await db
        .update(publishJobs)
        .set({
          status: "failed",
          lastError,
          updatedAt: now,
        })
        .where(eq(publishJobs.id, job.id));
    }
  }

  return processed;
}
