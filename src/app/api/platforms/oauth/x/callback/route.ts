import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/platforms/oauth-state";
import { fetchXMe } from "@/lib/platforms/x-api";
import { savePlatformConnection } from "@/lib/platforms/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const origin = new URL(request.url).origin;
  const redirectSettings = `${origin}/settings/platforms`;
  if (!code || !stateParam) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Missing OAuth parameters")}`);
  }
  const [signedState, codeVerifier] = stateParam.split(":");
  if (!signedState || !codeVerifier) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Invalid OAuth state payload")}`);
  }
  const parsed = verifyOAuthState(signedState);
  if (!parsed || parsed.provider !== "x" || parsed.platform !== "x") {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Invalid OAuth state")}`);
  }
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("X app is not configured")}`);
  }

  try {
    const redirectUri = `${origin}/api/platforms/oauth/x/callback`;
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
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
      throw new Error(tokenJson.error_description ?? "X token exchange failed");
    }

    const profile = await fetchXMe(tokenJson.access_token);
    savePlatformConnection({
      tenantId: parsed.tenantId,
      platform: "x",
      displayName: profile.name || profile.username,
      platformUserId: profile.id,
      platformPageId: "",
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? "",
      tokenExpiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : undefined,
      connectedBy: parsed.userId,
    });
    return NextResponse.redirect(`${redirectSettings}?oauth=success`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "X OAuth callback failed";
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent(message)}`);
  }
}
