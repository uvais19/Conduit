import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftComments, addComment, deleteComment } from "@/lib/content/comments";
import { createNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { contentDrafts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/drafts/comments?draftId=... */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const draftId = url.searchParams.get("draftId");
    if (!draftId) {
      return NextResponse.json({ error: "draftId required" }, { status: 400 });
    }
    const comments = await getDraftComments(draftId);
    return NextResponse.json({ comments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/drafts/comments — add a comment */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`comments:${user.id}`, { limit: 30, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { draftId, content, parentId, mentions } = body as {
      draftId?: string;
      content?: string;
      parentId?: string;
      mentions?: string[];
    };

    if (!draftId || !content?.trim()) {
      return NextResponse.json(
        { error: "draftId and content are required" },
        { status: 400 },
      );
    }

    const comment = await addComment({
      draftId,
      userId: user.id,
      content: content.trim(),
      parentId,
      mentions,
    });

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      const [draft] = await db
        .select({ caption: contentDrafts.caption, tenantId: contentDrafts.tenantId })
        .from(contentDrafts)
        .where(eq(contentDrafts.id, draftId))
        .limit(1);

      if (draft) {
        for (const mentionedUserId of mentions) {
          await createNotification({
            tenantId: draft.tenantId,
            userId: mentionedUserId,
            type: "draft_ready",
            title: `${user.name ?? "Someone"} mentioned you`,
            message: content.trim().slice(0, 100),
            link: `/approval?draft=${draftId}`,
          });
        }
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/drafts/comments — delete a comment */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();
    if (!body.commentId) {
      return NextResponse.json({ error: "commentId required" }, { status: 400 });
    }
    await deleteComment(body.commentId, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
