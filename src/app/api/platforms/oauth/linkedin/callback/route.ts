import { NextResponse } from "next/server";
import { savePlatformConnection } from "@/lib/platforms/store";
import { verifyOAuthState } from "@/lib/platforms/oauth-state";
import { fetchLinkedInProfile } from "@/lib/platforms/linkedin-api";

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
  if (!parsed || parsed.provider !== "linkedin" || parsed.platform !== "linkedin") {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("Invalid OAuth state")}`);
  }
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent("LinkedIn app is not configured")}`);
  }

  try {
    const redirectUri = `${origin}/api/platforms/oauth/linkedin/callback`;
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
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
      throw new Error(tokenJson.error_description ?? "LinkedIn token exchange failed");
    }

    const profile = await fetchLinkedInProfile(tokenJson.access_token);
    savePlatformConnection({
      tenantId: parsed.tenantId,
      platform: "linkedin",
      displayName: profile.displayName,
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
    const message = error instanceof Error ? error.message : "LinkedIn OAuth callback failed";
    return NextResponse.redirect(`${redirectSettings}?oauth=error&message=${encodeURIComponent(message)}`);
  }
}
