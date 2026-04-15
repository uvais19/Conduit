import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { attachmentHeaders, buildCsv } from "@/lib/exports/reporting";

/** GET /api/content/export — export drafts as JSON/CSV */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    const status = url.searchParams.get("status"); // optional filter
    const dateStamp = new Date().toISOString().slice(0, 10);

    const drafts = await db
      .select({
        id: contentDrafts.id,
        platform: contentDrafts.platform,
        pillar: contentDrafts.pillar,
        caption: contentDrafts.caption,
        hashtags: contentDrafts.hashtags,
        cta: contentDrafts.cta,
        mediaType: contentDrafts.mediaType,
        variantLabel: contentDrafts.variantLabel,
        status: contentDrafts.status,
        scheduledAt: contentDrafts.scheduledAt,
        publishedAt: contentDrafts.publishedAt,
        createdAt: contentDrafts.createdAt,
      })
      .from(contentDrafts)
      .where(
        status
          ? and(
              eq(contentDrafts.tenantId, user.tenantId),
              eq(contentDrafts.status, status as never)
            )
          : eq(contentDrafts.tenantId, user.tenantId)
      );

    if (format === "csv") {
      const headers = [
        "id",
        "platform",
        "pillar",
        "caption",
        "hashtags",
        "cta",
        "mediaType",
        "variantLabel",
        "status",
        "scheduledAt",
        "publishedAt",
        "createdAt",
      ];
      const csv = buildCsv(headers, drafts as Record<string, unknown>[]);
      return new Response(csv, {
        headers: attachmentHeaders("text/csv", `conduit-drafts-${dateStamp}.csv`),
      });
    }

    // Default: JSON
    return new Response(JSON.stringify({ drafts }, null, 2), {
      headers: attachmentHeaders(
        "application/json",
        `conduit-drafts-${dateStamp}.json`,
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
