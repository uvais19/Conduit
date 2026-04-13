import { randomUUID, createHash } from "crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { signOAuthState } from "@/lib/platforms/oauth-state";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const clientId = process.env.X_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "X_CLIENT_ID is not configured" }, { status: 503 });
    }

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/platforms/oauth/x/callback`;
    const state = signOAuthState({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      platform: "x",
      provider: "x",
    });
    const codeVerifier = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const url = new URL("https://twitter.com/i/oauth2/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    url.searchParams.set("state", `${state}:${codeVerifier}`);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return NextResponse.redirect(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to start X OAuth" }, { status: 500 });
  }
}
