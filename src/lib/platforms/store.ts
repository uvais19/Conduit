import { and, eq } from "drizzle-orm";
import type { Platform } from "@/lib/types";
import { decrypt, encrypt } from "@/lib/encryption";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";

export type PlatformConnection = {
  id: string;
  tenantId: string;
  platform: Platform;
  /** Display name — e.g. page name or handle */
  displayName: string;
  platformUserId: string;
  platformPageId: string;
  /** Decrypted for callers. Stored encrypted. */
  accessToken: string;
  /** Decrypted for callers. Stored encrypted. */
  refreshToken: string;
  tokenExpiresAt: string | null;
  connectedBy: string;
  lastRefreshAttemptAt: string | null;
  lastRefreshError: string | null;
  createdAt: string;
  updatedAt: string;
};

type ConnectionRow = typeof platformConnections.$inferSelect;

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toPublic(row: ConnectionRow): Omit<PlatformConnection, "accessToken" | "refreshToken"> {
  return {
    id: row.id,
    tenantId: row.tenantId,
    platform: row.platform,
    displayName: row.displayName,
    platformUserId: row.platformUserId ?? "",
    platformPageId: row.platformPageId ?? "",
    tokenExpiresAt: toIso(row.tokenExpiresAt),
    connectedBy: row.connectedBy ?? "",
    lastRefreshAttemptAt: toIso(row.lastRefreshAttemptAt),
    lastRefreshError: row.lastRefreshError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toConnection(row: ConnectionRow): PlatformConnection {
  return {
    ...toPublic(row),
    accessToken: decrypt(row.accessToken),
    refreshToken: row.refreshToken ? decrypt(row.refreshToken) : "",
  };
}

export async function listTenantIdsWithPlatformConnections(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tenantId: platformConnections.tenantId })
    .from(platformConnections);
  return rows.map((row) => row.tenantId);
}

export async function savePlatformConnection(params: {
  tenantId: string;
  platform: Platform;
  displayName: string;
  platformUserId: string;
  platformPageId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  connectedBy: string;
}): Promise<PlatformConnection> {
  const now = new Date();
  const accessToken = encrypt(params.accessToken);
  const refreshToken = encrypt(params.refreshToken ?? "");
  const tokenExpiresAt = params.tokenExpiresAt ? new Date(params.tokenExpiresAt) : null;
  const values = {
    tenantId: params.tenantId,
    platform: params.platform,
    displayName: params.displayName,
    platformUserId: params.platformUserId,
    platformPageId: params.platformPageId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    connectedBy: params.connectedBy,
    lastRefreshAttemptAt: null,
    lastRefreshError: null,
    updatedAt: now,
  };

  const [row] = await db
    .insert(platformConnections)
    .values(values)
    .onConflictDoUpdate({
      target: [platformConnections.tenantId, platformConnections.platform],
      set: {
        displayName: values.displayName,
        platformUserId: values.platformUserId,
        platformPageId: values.platformPageId,
        accessToken: values.accessToken,
        refreshToken: values.refreshToken,
        tokenExpiresAt: values.tokenExpiresAt,
        connectedBy: values.connectedBy,
        lastRefreshAttemptAt: null,
        lastRefreshError: null,
        updatedAt: now,
      },
    })
    .returning();

  return toConnection(row);
}

export async function listPlatformConnections(
  tenantId: string
): Promise<Omit<PlatformConnection, "accessToken" | "refreshToken">[]> {
  const rows = await db
    .select()
    .from(platformConnections)
    .where(eq(platformConnections.tenantId, tenantId));
  return rows.map(toPublic);
}

export async function getPlatformConnection(
  tenantId: string,
  platform: Platform
): Promise<PlatformConnection | null> {
  const [row] = await db
    .select()
    .from(platformConnections)
    .where(
      and(eq(platformConnections.tenantId, tenantId), eq(platformConnections.platform, platform))
    )
    .limit(1);
  if (!row) return null;
  return toConnection(row);
}

export async function disconnectPlatform(tenantId: string, platform: Platform): Promise<boolean> {
  const removed = await db
    .delete(platformConnections)
    .where(
      and(eq(platformConnections.tenantId, tenantId), eq(platformConnections.platform, platform))
    )
    .returning({ id: platformConnections.id });
  return removed.length > 0;
}

export async function updatePlatformConnectionTokens(params: {
  tenantId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string | null;
  refreshError?: string | null;
}): Promise<PlatformConnection | null> {
  const existing = await getPlatformConnection(params.tenantId, params.platform);
  if (!existing) return null;

  const now = new Date();
  const tokenExpiresAt =
    params.tokenExpiresAt === undefined
      ? existing.tokenExpiresAt
        ? new Date(existing.tokenExpiresAt)
        : null
      : params.tokenExpiresAt
        ? new Date(params.tokenExpiresAt)
        : null;

  const [row] = await db
    .update(platformConnections)
    .set({
      accessToken: encrypt(params.accessToken),
      refreshToken: encrypt(params.refreshToken ?? existing.refreshToken),
      tokenExpiresAt,
      lastRefreshAttemptAt: now,
      lastRefreshError: params.refreshError ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(platformConnections.tenantId, params.tenantId),
        eq(platformConnections.platform, params.platform)
      )
    )
    .returning();

  return row ? toConnection(row) : null;
}
