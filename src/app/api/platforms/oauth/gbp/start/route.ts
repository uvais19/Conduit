import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { signOAuthState } from "@/lib/platforms/oauth-state";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "GOOGLE_CLIENT_ID is not configured" }, { status: 503 });
    }
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/platforms/oauth/gbp/callback`;
    const state = signOAuthState({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      platform: "gbp",
      provider: "gbp",
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/business.manage profile openid"
    );
    url.searchParams.set("state", state);
    return NextResponse.redirect(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to start GBP OAuth" }, { status: 500 });
  }
}
