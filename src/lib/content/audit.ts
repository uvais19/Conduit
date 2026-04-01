import { randomUUID } from "crypto";
import type { ContentDraftRecord } from "@/lib/content/types";

export type TransitionAction = "submit" | "approve" | "revise" | "edit";

export type AuditEvent = {
  id: string;
  draftId: string;
  tenantId: string;
  action: TransitionAction;
  actorId: string;
  actorName: string;
  fromStatus: ContentDraftRecord["status"];
  toStatus: ContentDraftRecord["status"];
  notes: string;
  timestamp: string;
};

const eventsByTenant = new Map<string, AuditEvent[]>();

export function recordAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const record: AuditEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const existing = eventsByTenant.get(event.tenantId) ?? [];
  eventsByTenant.set(event.tenantId, [record, ...existing]);
  return record;
}

export function getAuditTrail(tenantId: string, draftId: string): AuditEvent[] {
  const events = eventsByTenant.get(tenantId) ?? [];
  return events.filter((e) => e.draftId === draftId);
}

// Valid status transitions per action
const TRANSITIONS: Record<
  TransitionAction,
  { from: ContentDraftRecord["status"][]; to: ContentDraftRecord["status"] }
> = {
  submit: { from: ["draft", "revision-requested"], to: "in-review" },
  approve: { from: ["in-review"], to: "approved" },
  revise:  { from: ["in-review"], to: "revision-requested" },
  edit:    { from: ["draft", "revision-requested"], to: "draft" },
};

export function resolveTransition(
  action: TransitionAction,
  currentStatus: ContentDraftRecord["status"]
): ContentDraftRecord["status"] | null {
  const t = TRANSITIONS[action];
  if (!t.from.includes(currentStatus)) return null;
  return t.to;
}
