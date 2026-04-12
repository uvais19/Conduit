import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** GET /api/content/export — export drafts as JSON/CSV */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    const status = url.searchParams.get("status"); // optional filter

    let query = db
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
      .where(eq(contentDrafts.tenantId, user.tenantId))
      .$dynamic();

    if (status) {
      query = query.where(eq(contentDrafts.status, status as never));
    }

    const drafts = await query;

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

      const escapeCSV = (val: unknown) => {
        if (val === null || val === undefined) return "";
        const str = Array.isArray(val) ? val.join("; ") : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = drafts.map((d) =>
        headers.map((h) => escapeCSV((d as Record<string, unknown>)[h])).join(","),
      );

      const csv = [headers.join(","), ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="conduit-drafts-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: JSON
    return new Response(JSON.stringify({ drafts }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="conduit-drafts-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
