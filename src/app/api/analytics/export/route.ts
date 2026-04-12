import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { postAnalytics, contentDrafts } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/** GET /api/analytics/export — export analytics report as CSV or JSON */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const conditions = [eq(contentDrafts.tenantId, user.tenantId)];

    if (from) conditions.push(gte(postAnalytics.collectedAt, new Date(from)));
    if (to) conditions.push(lte(postAnalytics.collectedAt, new Date(to)));

    const rows = await db
      .select({
        draftId: postAnalytics.draftId,
        platform: postAnalytics.platform,
        collectedAt: postAnalytics.collectedAt,
        impressions: postAnalytics.impressions,
        reach: postAnalytics.reach,
        likes: postAnalytics.likes,
        comments: postAnalytics.comments,
        shares: postAnalytics.shares,
        saves: postAnalytics.saves,
        clicks: postAnalytics.clicks,
        engagementRate: postAnalytics.engagementRate,
        caption: contentDrafts.caption,
        pillar: contentDrafts.pillar,
        status: contentDrafts.status,
      })
      .from(postAnalytics)
      .innerJoin(contentDrafts, eq(postAnalytics.draftId, contentDrafts.id))
      .where(and(...conditions))
      .orderBy(desc(postAnalytics.collectedAt))
      .limit(5000);

    if (format === "csv") {
      const headers = [
        "draftId",
        "platform",
        "caption",
        "pillar",
        "impressions",
        "reach",
        "likes",
        "comments",
        "shares",
        "saves",
        "clicks",
        "engagementRate",
        "collectedAt",
      ];

      const escapeCSV = (val: unknown) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = rows.map((r) =>
        headers
          .map((h) => escapeCSV((r as Record<string, unknown>)[h]))
          .join(","),
      );
      const csv = [headers.join(","), ...csvRows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="conduit-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify({ analytics: rows }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="conduit-analytics-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
