import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/platforms/oauth-state";
import { fetchGbpAccount, fetchGbpFirstLocation } from "@/lib/platforms/gbp-api";
import { savePlatformConnection } from "@/lib/platforms/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = new URL(request.url).origin;
  const redirectSettings = `${origin}/settings/platforms`;
  if (!code || !state) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Missing OAuth parameters")}`);
  }
  const parsed = verifyOAuthState(state);
  if (!parsed || parsed.provider !== "gbp" || parsed.platform !== "gbp") {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Invalid OAuth state")}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Google OAuth is not configured")}`);
  }

  try {
    const redirectUri = `${origin}/api/platforms/oauth/gbp/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description ?? "Google token exchange failed");
    }

    const account = await fetchGbpAccount(tokenJson.access_token);
    const location = await fetchGbpFirstLocation(tokenJson.access_token, account.accountName);
    savePlatformConnection({
      tenantId: parsed.tenantId,
      platform: "gbp",
      displayName: location.title || account.displayName,
      platformUserId: account.accountName,
      platformPageId: location.locationName,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? "",
      tokenExpiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : undefined,
      connectedBy: parsed.userId,
    });
    return NextResponse.redirect(`${redirectSettings}?oauth=success`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GBP OAuth callback failed";
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent(message)}`);
  }
}
