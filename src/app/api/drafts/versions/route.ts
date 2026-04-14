import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/permissions";
import {
  getDraftVersionForTenant,
  getDraftVersions,
  saveDraftVersion,
} from "@/lib/content/versioning";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/drafts/versions?draftId=... — get version history */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const draftId = new URL(req.url).searchParams.get("draftId");
    if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

    const draft = await getDraftById(user.tenantId, draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const versions = await getDraftVersions(draftId);
    return NextResponse.json({ versions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/drafts/versions — save snapshot, or restore: { restoreVersionId, draftId } */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("edit_drafts");
    const user = session.user;
    const limited = rateLimitResponse(`versions:${user.id}`, { limit: 30, windowSeconds: 60 });
    if (limited) return limited;

    const body = (await req.json()) as {
      draftId?: string;
      caption?: string;
      hashtags?: string[];
      cta?: string;
      changeDescription?: string;
      restoreVersionId?: string;
    };

    if (body.restoreVersionId && body.draftId) {
      if (!(await getDraftById(user.tenantId, body.draftId))) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      const snap = await getDraftVersionForTenant(body.restoreVersionId, user.tenantId);
      if (!snap || snap.draftId !== body.draftId) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      const hashtags = (snap.hashtags as string[] | null) ?? [];
      const cta = snap.cta ?? "";

      await updateDraft(user.tenantId, body.draftId, {
        caption: snap.caption,
        hashtags,
        cta,
      });

      await saveDraftVersion({
        draftId: body.draftId,
        caption: snap.caption,
        hashtags,
        cta,
        editedBy: user.id,
        changeDescription: `Restored from ${snap.version}`,
      });

      const draft = await getDraftById(user.tenantId, body.draftId);
      return NextResponse.json({ draft, restoredFrom: snap.version });
    }

    const { draftId, caption, hashtags, cta, changeDescription } = body;

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
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
