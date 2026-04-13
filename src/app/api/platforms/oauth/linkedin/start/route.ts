import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { signOAuthState } from "@/lib/platforms/oauth-state";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "LINKEDIN_CLIENT_ID is not configured" }, { status: 503 });
    }
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/platforms/oauth/linkedin/callback`;
    const state = signOAuthState({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      platform: "linkedin",
      provider: "linkedin",
    });
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "openid profile w_member_social r_organization_social r_organization_admin");
    url.searchParams.set("state", state);
    return NextResponse.redirect(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to start LinkedIn OAuth" }, { status: 500 });
  }
}
