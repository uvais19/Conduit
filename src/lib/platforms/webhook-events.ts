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

const webhookEventsByTenant = new Map<string, NormalizedPlatformWebhookEvent[]>();
const seenWebhookKeysByTenant = new Map<string, Set<string>>();
const webhookDeliveryMetricsByTenant = new Map<
  string,
  { ingested: number; deduped: number; processed: number }
>();

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
  processWebhookDownstream(tenantId, withStatus);
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
