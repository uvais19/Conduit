import { NextResponse } from "next/server";
import { graphGet, META_GRAPH_VERSION } from "@/lib/platforms/meta-graph";
import { verifyMetaOAuthState } from "@/lib/platforms/meta-oauth-state";
import { savePlatformConnection } from "@/lib/platforms/store";

type PageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr =
    searchParams.get("error_description") ?? searchParams.get("error");
  const origin = new URL(request.url).origin;
  const redirectSettings = `${origin}/settings/platforms`;

  if (oauthErr) {
    return NextResponse.redirect(
      `${redirectSettings}?oauth=error&message=${encodeURIComponent(oauthErr)}`
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectSettings}?oauth=error&message=${encodeURIComponent("Missing OAuth parameters")}`
    );
  }

  const payload = verifyMetaOAuthState(state);
  if (!payload) {
    return NextResponse.redirect(
      `${redirectSettings}?oauth=error&message=${encodeURIComponent("Invalid OAuth state")}`
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${redirectSettings}?oauth=error&message=${encodeURIComponent("Meta app not configured")}`
    );
  }

  const redirectUri = `${origin}/api/platforms/oauth/meta/callback`;

  try {
    const tokenUrl = new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`
    );
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const shortRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
    const shortJson = (await shortRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!shortRes.ok || !shortJson.access_token) {
      throw new Error(shortJson.error?.message ?? "Token exchange failed");
    }

    const extendUrl = new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`
    );
    extendUrl.searchParams.set("grant_type", "fb_exchange_token");
    extendUrl.searchParams.set("client_id", appId);
    extendUrl.searchParams.set("client_secret", appSecret);
    extendUrl.searchParams.set("fb_exchange_token", shortJson.access_token);

    const longRes = await fetch(extendUrl.toString(), { cache: "no-store" });
    const longJson = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!longRes.ok || !longJson.access_token) {
      throw new Error("Long-lived token exchange failed");
    }

    const userToken = longJson.access_token;
    const expiresIn = longJson.expires_in ?? 5184000;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const accounts = await graphGet<{ data?: PageAccount[] }>("/me/accounts", {
      fields: "name,id,access_token,instagram_business_account",
      access_token: userToken,
    });

    const pages = accounts.data ?? [];
    let chosen: PageAccount | undefined;

    if (payload.platform === "instagram") {
      chosen = pages.find((p) => p.instagram_business_account?.id);
    } else {
      chosen = pages[0];
    }

    if (!chosen) {
      return NextResponse.redirect(
        `${redirectSettings}?oauth=error&message=${encodeURIComponent(
          payload.platform === "instagram"
            ? "No Facebook Page with a linked Instagram Business account was found for this Meta login."
            : "No Facebook Pages were found for this Meta login."
        )}`
      );
    }

    const igba = chosen.instagram_business_account;

    if (payload.platform === "instagram" && !igba?.id) {
      return NextResponse.redirect(
        `${redirectSettings}?oauth=error&message=${encodeURIComponent(
          "Instagram requires a Page linked to an Instagram Business account."
        )}`
      );
    }

    savePlatformConnection({
      tenantId: payload.tenantId,
      platform: payload.platform,
      displayName: chosen.name,
      platformUserId: payload.platform === "instagram" ? (igba?.id ?? "") : chosen.id,
      platformPageId: chosen.id,
      accessToken: chosen.access_token,
      refreshToken: userToken,
      tokenExpiresAt,
      connectedBy: payload.userId,
    });

    return NextResponse.redirect(`${redirectSettings}?oauth=success`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth callback failed";
    return NextResponse.redirect(
      `${redirectSettings}?oauth=error&message=${encodeURIComponent(msg)}`
    );
  }
}
