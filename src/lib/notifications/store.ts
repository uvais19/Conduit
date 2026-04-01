import { randomUUID } from "crypto";

export type NotificationType = "submitted" | "approved" | "revision-requested";

export type AppNotification = {
  id: string;
  tenantId: string;
  type: NotificationType;
  draftId: string;
  actorName: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const notificationsByTenant = new Map<string, AppNotification[]>();

export function fireNotification(
  payload: Omit<AppNotification, "id" | "read" | "createdAt">
): AppNotification {
  const notification: AppNotification = {
    ...payload,
    id: randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  };

  const existing = notificationsByTenant.get(payload.tenantId) ?? [];
  notificationsByTenant.set(payload.tenantId, [notification, ...existing]);
  return notification;
}

export function listNotifications(tenantId: string): AppNotification[] {
  return notificationsByTenant.get(tenantId) ?? [];
}

export function markNotificationRead(tenantId: string, id: string): boolean {
  const notifications = notificationsByTenant.get(tenantId) ?? [];
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) return false;

  notifications[index] = { ...notifications[index], read: true };
  notificationsByTenant.set(tenantId, notifications);
  return true;
}

export function markAllRead(tenantId: string): void {
  const notifications = notificationsByTenant.get(tenantId) ?? [];
  notificationsByTenant.set(
    tenantId,
    notifications.map((n) => ({ ...n, read: true }))
  );
}
