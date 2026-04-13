import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { META_GRAPH_VERSION } from "@/lib/platforms/meta-graph";
import {
  signMetaOAuthState,
  type MetaOAuthPlatform,
} from "@/lib/platforms/meta-oauth-state";

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export async function GET(request: Request) {
  try {
    const session = await requirePermission("connect_platforms");
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") as MetaOAuthPlatform | null;
    if (platform !== "instagram" && platform !== "facebook") {
      return NextResponse.json(
        { error: "Invalid platform — use instagram or facebook" },
        { status: 400 }
      );
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          error:
            "Meta app is not fully configured — set META_APP_ID and META_APP_SECRET",
        },
        { status: 503 }
      );
    }

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/platforms/oauth/meta/callback`;
    const state = signMetaOAuthState({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      platform,
    });

    const url = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", META_SCOPES);

    return NextResponse.redirect(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Meta OAuth start failed:", error);
    return NextResponse.json({ error: "Unable to start Meta OAuth" }, { status: 500 });
  }
}
