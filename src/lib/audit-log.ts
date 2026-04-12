import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenants, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

// ============================================================
//  Activity Audit Log — tracks every meaningful user action.
// ============================================================

/** The activityLog table is defined inline here to avoid touching the main
 *  schema during this enhancement phase. It will be merged into schema.ts
 *  on next migration consolidation. */
export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(), // e.g. "draft.created", "approval.approved"
  resourceType: text("resource_type"), // e.g. "draft", "strategy", "brand"
  resourceId: text("resource_id"), // ID of the resource affected
  metadata: jsonb("metadata"), // Extra context (old values, change summary, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityAction =
  | "draft.created"
  | "draft.edited"
  | "draft.submitted"
  | "draft.approved"
  | "draft.revision_requested"
  | "draft.revised"
  | "draft.scheduled"
  | "draft.published"
  | "draft.failed"
  | "draft.deleted"
  | "strategy.created"
  | "strategy.updated"
  | "strategy.generated"
  | "brand.created"
  | "brand.updated"
  | "platform.connected"
  | "platform.disconnected"
  | "analytics.collected"
  | "competitor.added"
  | "competitor.analyzed"
  | "proposal.created"
  | "proposal.approved"
  | "proposal.rejected"
  | "team.member_invited"
  | "team.role_changed"
  | "team.member_removed"
  | "settings.updated";

export type LogActivityInput = {
  tenantId: string;
  userId: string;
  action: ActivityAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

/** Insert a row into the activity log. */
export async function logActivity(input: LogActivityInput) {
  try {
    await db.insert(activityLog).values({
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Activity logging should never break the main flow
    console.error("[audit] Failed to log activity:", input.action);
  }
}

/** Get recent activity for a tenant. */
export async function getRecentActivity(
  tenantId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.tenantId, tenantId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);
}
