import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftVersions, saveDraftVersion } from "@/lib/content/versioning";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/drafts/versions?draftId=... — get version history */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const draftId = new URL(req.url).searchParams.get("draftId");
    if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

    const versions = await getDraftVersions(draftId);
    return NextResponse.json({ versions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/drafts/versions — save a new version snapshot */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const limited = rateLimitResponse(`versions:${user.id}`, { limit: 30, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { draftId, caption, hashtags, cta, changeDescription } = body as {
      draftId?: string;
      caption?: string;
      hashtags?: string[];
      cta?: string;
      changeDescription?: string;
    };

    if (!draftId || !caption) {
      return NextResponse.json({ error: "draftId and caption required" }, { status: 400 });
    }

    const version = await saveDraftVersion({
      draftId,
      caption,
      hashtags,
      cta,
      editedBy: user.id,
      changeDescription,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
