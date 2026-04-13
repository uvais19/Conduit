import type { Platform } from "@/lib/types";

export type NormalizedPlatformWebhookEvent = {
  id: string;
  platform: Platform;
  eventType: "comment" | "mention" | "engagement" | "other";
  occurredAt: string;
  actorId?: string;
  postId?: string;
  payload: unknown;
};

const webhookEventsByTenant = new Map<string, NormalizedPlatformWebhookEvent[]>();

export function ingestWebhookEvent(
  tenantId: string,
  event: NormalizedPlatformWebhookEvent
): void {
  const existing = webhookEventsByTenant.get(tenantId) ?? [];
  webhookEventsByTenant.set(tenantId, [event, ...existing].slice(0, 500));
}

export function classifyWebhookEventType(value: unknown): NormalizedPlatformWebhookEvent["eventType"] {
  const text = JSON.stringify(value ?? "").toLowerCase();
  if (text.includes("comment")) return "comment";
  if (text.includes("mention")) return "mention";
  if (text.includes("like") || text.includes("engagement") || text.includes("reaction")) return "engagement";
  return "other";
}
