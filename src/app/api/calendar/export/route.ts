import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { attachmentHeaders, buildCsv } from "@/lib/exports/reporting";

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** GET /api/calendar/export?format=csv|ics */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";
    const dateStamp = new Date().toISOString().slice(0, 10);

    const drafts = await db
      .select({
        id: contentDrafts.id,
        platform: contentDrafts.platform,
        caption: contentDrafts.caption,
        scheduledAt: contentDrafts.scheduledAt,
      })
      .from(contentDrafts)
      .where(
        and(
          eq(contentDrafts.tenantId, user.tenantId),
          eq(contentDrafts.status, "scheduled"),
        ),
      );

    const scheduled = drafts.filter((draft) => Boolean(draft.scheduledAt));

    if (format === "ics") {
      const events = scheduled
        .map((draft) => {
          const start = draft.scheduledAt as Date;
          const end = new Date(start.getTime() + 30 * 60 * 1000);
          const summary = `Conduit post (${draft.platform})`;
          const description = (draft.caption ?? "").slice(0, 120).replace(/\n/g, " ");
          return [
            "BEGIN:VEVENT",
            `UID:${draft.id}@conduit`,
            `DTSTAMP:${toIcsDate(new Date())}`,
            `DTSTART:${toIcsDate(start)}`,
            `DTEND:${toIcsDate(end)}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            "END:VEVENT",
          ].join("\r\n");
        })
        .join("\r\n");

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Conduit//Content Calendar//EN",
        "CALSCALE:GREGORIAN",
        events,
        "END:VCALENDAR",
      ].join("\r\n");

      return new Response(ics, {
        headers: attachmentHeaders(
          "text/calendar; charset=utf-8",
          `conduit-calendar-${dateStamp}.ics`,
        ),
      });
    }

    const headers = ["id", "platform", "scheduledAt", "caption"];
    const csvRows = scheduled.map((draft) => ({
      id: draft.id,
      platform: draft.platform,
      scheduledAt: (draft.scheduledAt as Date).toISOString(),
      caption: draft.caption,
    }));
    const csv = buildCsv(headers, csvRows);
    return new Response(csv, {
      headers: attachmentHeaders("text/csv", `conduit-calendar-${dateStamp}.csv`),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
