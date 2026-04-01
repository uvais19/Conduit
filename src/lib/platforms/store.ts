import { randomUUID } from "crypto";
import type { Platform } from "@/lib/types";
import { encrypt, decrypt } from "@/lib/encryption";

export type PlatformConnection = {
  id: string;
  tenantId: string;
  platform: Platform;
  /** Display name — e.g. page name or handle */
  displayName: string;
  platformUserId: string;
  platformPageId: string;
  /** Encrypted at rest */
  accessToken: string;
  /** Encrypted at rest */
  refreshToken: string;
  tokenExpiresAt: string | null;
  connectedBy: string;
  createdAt: string;
  updatedAt: string;
};

const connectionsByTenant = new Map<string, PlatformConnection[]>();

function hasEncryptionKey(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

function safeEncrypt(value: string): string {
  return hasEncryptionKey() ? encrypt(value) : value;
}

function safeDecrypt(value: string): string {
  return hasEncryptionKey() ? decrypt(value) : value;
}

export function savePlatformConnection(params: {
  tenantId: string;
  platform: Platform;
  displayName: string;
  platformUserId: string;
  platformPageId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  connectedBy: string;
}): PlatformConnection {
  const now = new Date().toISOString();
  const existing = connectionsByTenant.get(params.tenantId) ?? [];

  // Remove previous connection for the same platform (replace)
  const filtered = existing.filter((c) => c.platform !== params.platform);

  const connection: PlatformConnection = {
    id: randomUUID(),
    tenantId: params.tenantId,
    platform: params.platform,
    displayName: params.displayName,
    platformUserId: params.platformUserId,
    platformPageId: params.platformPageId,
    accessToken: safeEncrypt(params.accessToken),
    refreshToken: safeEncrypt(params.refreshToken ?? ""),
    tokenExpiresAt: params.tokenExpiresAt ?? null,
    connectedBy: params.connectedBy,
    createdAt: now,
    updatedAt: now,
  };

  connectionsByTenant.set(params.tenantId, [connection, ...filtered]);
  return connection;
}

export function listPlatformConnections(tenantId: string): Omit<PlatformConnection, "accessToken" | "refreshToken">[] {
  const connections = connectionsByTenant.get(tenantId) ?? [];
  return connections.map(({ accessToken, refreshToken, ...rest }) => rest);
}

export function getPlatformConnection(
  tenantId: string,
  platform: Platform
): PlatformConnection | null {
  const connections = connectionsByTenant.get(tenantId) ?? [];
  const found = connections.find((c) => c.platform === platform);
  if (!found) return null;

  return {
    ...found,
    accessToken: safeDecrypt(found.accessToken),
    refreshToken: safeDecrypt(found.refreshToken),
  };
}

export function disconnectPlatform(tenantId: string, platform: Platform): boolean {
  const connections = connectionsByTenant.get(tenantId) ?? [];
  const filtered = connections.filter((c) => c.platform !== platform);
  if (filtered.length === connections.length) return false;
  connectionsByTenant.set(tenantId, filtered);
  return true;
}
