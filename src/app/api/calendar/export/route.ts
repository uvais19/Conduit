import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";

function escapeCsv(val: unknown) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** GET /api/calendar/export?format=csv|ics */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";

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
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="conduit-calendar-${new Date().toISOString().slice(0, 10)}.ics"`,
        },
      });
    }

    const headers = ["id", "platform", "scheduledAt", "caption"];
    const rows = scheduled.map((draft) =>
      [
        escapeCsv(draft.id),
        escapeCsv(draft.platform),
        escapeCsv((draft.scheduledAt as Date).toISOString()),
        escapeCsv(draft.caption),
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="conduit-calendar-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
