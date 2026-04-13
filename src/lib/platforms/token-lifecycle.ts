import type { PlatformConnection } from "@/lib/platforms/store";
import { updatePlatformConnectionTokens } from "@/lib/platforms/store";

async function refreshLinkedInToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn client credentials are not configured");
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? "LinkedIn token refresh failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}

async function refreshXToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("X client credentials are not configured");
  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? "X token refresh failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google client credentials are not configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? "Google token refresh failed");
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function refreshConnectionToken(
  connection: PlatformConnection
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!connection.refreshToken?.trim()) {
    return { ok: false, error: "Missing refresh token" };
  }
  try {
    let refreshed:
      | { accessToken: string; refreshToken?: string; expiresIn?: number }
      | undefined;
    if (connection.platform === "linkedin") {
      refreshed = await refreshLinkedInToken(connection.refreshToken);
    } else if (connection.platform === "x") {
      refreshed = await refreshXToken(connection.refreshToken);
    } else if (connection.platform === "gbp") {
      refreshed = await refreshGoogleToken(connection.refreshToken);
    } else {
      // Meta long-lived user/page tokens are refreshed via reauth.
      return { ok: true };
    }
    const tokenExpiresAt = refreshed.expiresIn
      ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
      : connection.tokenExpiresAt;
    updatePlatformConnectionTokens({
      tenantId: connection.tenantId,
      platform: connection.platform,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt,
      refreshError: null,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed";
    updatePlatformConnectionTokens({
      tenantId: connection.tenantId,
      platform: connection.platform,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      refreshError: message,
    });
    return { ok: false, error: message };
  }
}
