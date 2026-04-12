import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type CreateNotificationInput = {
  tenantId: string;
  userId: string;
  type:
    | "draft_ready"
    | "draft_approved"
    | "revision_requested"
    | "post_published"
    | "post_failed"
    | "analytics_summary"
    | "optimization_proposal"
    | "competitor_alert";
  title: string;
  message: string;
  link?: string;
};

/** Create a notification row. */
export async function createNotification(input: CreateNotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    })
    .returning();
  return row;
}

/** Get unread count for user. */
export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

/** Get recent notifications for a user (paginated). */
export async function getUserNotifications(
  userId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Mark a single notification as read. */
export async function markAsRead(notificationId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
}

/** Mark all notifications as read for a user. */
export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

/** Dispatch a notification to all users of a tenant (broadcast). */
export async function broadcastToTenant(
  tenantId: string,
  userIds: string[],
  payload: Omit<CreateNotificationInput, "tenantId" | "userId">,
) {
  if (userIds.length === 0) return;
  const values = userIds.map((userId) => ({
    tenantId,
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link ?? null,
  }));
  await db.insert(notifications).values(values);
}
