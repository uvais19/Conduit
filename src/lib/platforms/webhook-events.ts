import type { Platform } from "@/lib/types";
import { fireNotification } from "@/lib/notifications/store";

export type NormalizedPlatformWebhookEvent = {
  id: string;
  platform: Platform;
  eventType: "comment" | "mention" | "engagement" | "other";
  occurredAt: string;
  actorId?: string;
  postId?: string;
  payload: unknown;
  dedupeKey?: string;
  processingStatus?: "ingested" | "deduped" | "processed";
};

type WebhookQueueJob = {
  id: string;
  tenantId: string;
  event: NormalizedPlatformWebhookEvent;
  status: "pending" | "running" | "processed" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledAt: string;
  processedAt?: string;
};

const webhookEventsByTenant = new Map<string, NormalizedPlatformWebhookEvent[]>();
const seenWebhookKeysByTenant = new Map<string, Set<string>>();
const webhookDeliveryMetricsByTenant = new Map<
  string,
  { ingested: number; deduped: number; processed: number }
>();
const webhookJobsByTenant = new Map<string, WebhookQueueJob[]>();

function bumpWebhookMetric(
  tenantId: string,
  key: "ingested" | "deduped" | "processed"
): void {
  const existing = webhookDeliveryMetricsByTenant.get(tenantId) ?? {
    ingested: 0,
    deduped: 0,
    processed: 0,
  };
  existing[key] += 1;
  webhookDeliveryMetricsByTenant.set(tenantId, existing);
}

function shouldDedupe(tenantId: string, dedupeKey?: string): boolean {
  if (!dedupeKey) return false;
  const existing = seenWebhookKeysByTenant.get(tenantId) ?? new Set<string>();
  if (existing.has(dedupeKey)) return true;
  existing.add(dedupeKey);
  // bounded memory
  if (existing.size > 1000) {
    const values = [...existing.values()];
    values.slice(0, 200).forEach((value) => existing.delete(value));
  }
  seenWebhookKeysByTenant.set(tenantId, existing);
  return false;
}

export function ingestWebhookEvent(
  tenantId: string,
  event: NormalizedPlatformWebhookEvent
): void {
  if (shouldDedupe(tenantId, event.dedupeKey)) {
    bumpWebhookMetric(tenantId, "deduped");
    const existing = webhookEventsByTenant.get(tenantId) ?? [];
    const dedupedEvent: NormalizedPlatformWebhookEvent = {
      ...event,
      processingStatus: "deduped",
    };
    webhookEventsByTenant.set(
      tenantId,
      [dedupedEvent, ...existing].slice(0, 500)
    );
    return;
  }

  bumpWebhookMetric(tenantId, "ingested");
  const withStatus: NormalizedPlatformWebhookEvent = {
    ...event,
    processingStatus: "ingested",
  };
  const existing = webhookEventsByTenant.get(tenantId) ?? [];
  webhookEventsByTenant.set(tenantId, [withStatus, ...existing].slice(0, 500));
  enqueueWebhookEvent(tenantId, withStatus);
}

export function classifyWebhookEventType(value: unknown): NormalizedPlatformWebhookEvent["eventType"] {
  const text = JSON.stringify(value ?? "").toLowerCase();
  if (text.includes("comment")) return "comment";
  if (text.includes("mention")) return "mention";
  if (text.includes("like") || text.includes("engagement") || text.includes("reaction")) return "engagement";
  return "other";
}

function processWebhookDownstream(
  tenantId: string,
  event: NormalizedPlatformWebhookEvent
): void {
  const typeLabel =
    event.eventType === "comment"
      ? "new comment activity"
      : event.eventType === "mention"
        ? "new mention activity"
        : event.eventType === "engagement"
          ? "new engagement activity"
          : "platform webhook activity";
  fireNotification({
    tenantId,
    type: "submitted",
    draftId: event.postId ?? event.id,
    actorName: `${event.platform} webhook`,
    message: `Received ${typeLabel}.`,
  });
  bumpWebhookMetric(tenantId, "processed");
}

function enqueueWebhookEvent(
  tenantId: string,
  event: NormalizedPlatformWebhookEvent
): WebhookQueueJob {
  const job: WebhookQueueJob = {
    id: event.id,
    tenantId,
    event,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
  };
  const existing = webhookJobsByTenant.get(tenantId) ?? [];
  webhookJobsByTenant.set(tenantId, [job, ...existing].slice(0, 1000));
  return job;
}

export function processWebhookJobs(maxJobs = 100): {
  processed: number;
  succeeded: number;
  failed: number;
} {
  const now = Date.now();
  const jobs: WebhookQueueJob[] = [];
  webhookJobsByTenant.forEach((tenantJobs) => {
    tenantJobs.forEach((job) => jobs.push(job));
  });
  const pending = jobs
    .filter(
      (job) =>
        job.status === "pending" &&
        new Date(job.scheduledAt).getTime() <= now
    )
    .slice(0, maxJobs);
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  for (const job of pending) {
    processed += 1;
    job.status = "running";
    job.attempts += 1;
    try {
      processWebhookDownstream(job.tenantId, { ...job.event, processingStatus: "processed" });
      job.status = "processed";
      job.processedAt = new Date().toISOString();
      succeeded += 1;
    } catch (error) {
      if (job.attempts < job.maxAttempts) {
        job.status = "pending";
        job.lastError = error instanceof Error ? error.message : "webhook-processing-error";
        job.scheduledAt = new Date(Date.now() + 1000 * 2 ** job.attempts).toISOString();
      } else {
        job.status = "failed";
        job.lastError = error instanceof Error ? error.message : "webhook-processing-error";
        failed += 1;
      }
    }
  }
  return { processed, succeeded, failed };
}

export function getWebhookDeliveryMetrics(tenantId: string): {
  ingested: number;
  deduped: number;
  processed: number;
} {
  return (
    webhookDeliveryMetricsByTenant.get(tenantId) ?? {
      ingested: 0,
      deduped: 0,
      processed: 0,
    }
  );
}
