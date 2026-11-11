import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformConnections, webhookDeliveries } from "@/lib/db/schema";
import { notifyTenant } from "@/lib/notifications";
import type { Platform } from "@/lib/types";

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

export type WebhookDeliveryDecision = "duplicate" | "skipped" | "pending";

export type ConnectionIdentity = {
  tenantId: string;
  platformPageId: string;
  platformUserId: string;
};

export function decideWebhookDelivery(
  duplicate: boolean,
  tenantId: string | null,
): WebhookDeliveryDecision {
  if (duplicate) return "duplicate";
  if (!tenantId) return "skipped";
  return "pending";
}

export function shouldNotifyWebhook(decision: WebhookDeliveryDecision): boolean {
  return decision === "pending";
}

export function matchConnectionTenant(
  providerId: string,
  connections: ConnectionIdentity[],
): string | null {
  const id = providerId.trim();
  if (!id || id === "global") return null;
  return (
    connections.find(
      (connection) => connection.platformPageId === id || connection.platformUserId === id,
    )?.tenantId ?? null
  );
}

export function classifyWebhookEventType(value: unknown): NormalizedPlatformWebhookEvent["eventType"] {
  const text = JSON.stringify(value ?? "").toLowerCase();
  if (text.includes("comment")) return "comment";
  if (text.includes("mention")) return "mention";
  if (text.includes("like") || text.includes("engagement") || text.includes("reaction")) return "engagement";
  return "other";
}

function activityLabel(eventType: NormalizedPlatformWebhookEvent["eventType"]): string {
  if (eventType === "comment") return "new comment activity";
  if (eventType === "mention") return "new mention activity";
  if (eventType === "engagement") return "new engagement activity";
  return "platform webhook activity";
}

async function resolveTenantId(platform: Platform, providerId: string): Promise<string | null> {
  const id = providerId.trim();
  if (!id || id === "global") return null;
  const rows = await db
    .select({
      tenantId: platformConnections.tenantId,
      platformPageId: platformConnections.platformPageId,
      platformUserId: platformConnections.platformUserId,
    })
    .from(platformConnections)
    .where(
      and(
        eq(platformConnections.platform, platform),
        or(
          eq(platformConnections.platformPageId, id),
          eq(platformConnections.platformUserId, id),
        ),
      ),
    );
  return matchConnectionTenant(
    id,
    rows.map((row) => ({
      tenantId: row.tenantId,
      platformPageId: row.platformPageId ?? "",
      platformUserId: row.platformUserId ?? "",
    })),
  );
}

export async function ingestWebhookEvent(
  providerId: string,
  event: NormalizedPlatformWebhookEvent,
): Promise<WebhookDeliveryDecision> {
  const tenantId = await resolveTenantId(event.platform, providerId);
  const dedupeKey = event.dedupeKey?.trim() || event.id;
  const [inserted] = await db
    .insert(webhookDeliveries)
    .values({
      platform: event.platform,
      dedupeKey,
      tenantId,
      eventType: event.eventType,
      payload: event.payload ?? {},
      status: tenantId ? "pending" : "skipped",
      occurredAt: new Date(event.occurredAt),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [webhookDeliveries.platform, webhookDeliveries.dedupeKey],
    })
    .returning({ id: webhookDeliveries.id });

  return decideWebhookDelivery(!inserted, tenantId);
}

export async function processWebhookJobs(maxJobs = 100): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pending = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.status, "pending"))
    .limit(maxJobs);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  for (const row of pending) {
    processed += 1;
    if (!row.tenantId) {
      await db
        .update(webhookDeliveries)
        .set({ status: "skipped", updatedAt: new Date() })
        .where(eq(webhookDeliveries.id, row.id));
      continue;
    }
    try {
      await notifyTenant({
        tenantId: row.tenantId,
        roles: ["admin", "approver"],
        type: "draft_ready",
        title: `${row.platform} activity`,
        message: `Received ${activityLabel(row.eventType as NormalizedPlatformWebhookEvent["eventType"])}.`,
        link: "/approval",
      });
      await db
        .update(webhookDeliveries)
        .set({ status: "processed", updatedAt: new Date() })
        .where(eq(webhookDeliveries.id, row.id));
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed, succeeded, failed };
}
