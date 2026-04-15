import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getAttributionSummary,
  recordConversionForDraft,
} from "@/lib/analytics/store";
import { parseAnalyticsQueryFromUrl } from "@/lib/analytics/query";
import { logActivity } from "@/lib/audit-log";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const query = parseAnalyticsQueryFromUrl(new URL(request.url));
    const summary = await getAttributionSummary(session.user.tenantId, query);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Unable to fetch conversion summary" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const body = (await request.json()) as {
      draftId?: unknown;
      visits?: unknown;
      conversions?: unknown;
      revenue?: unknown;
    };
    if (typeof body.draftId !== "string" || !body.draftId.trim()) {
      return NextResponse.json({ error: "draftId is required." }, { status: 400 });
    }
    const visits = Number(body.visits ?? 0);
    const conversions = Number(body.conversions ?? 0);
    const revenue = Number(body.revenue ?? 0);

    const summary = await recordConversionForDraft({
      tenantId: session.user.tenantId,
      draftId: body.draftId,
      visits,
      conversions,
      revenue,
    });
    await logActivity({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "conversion",
      resourceId: body.draftId,
      metadata: { visits, conversions, revenue },
    });
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "No analytics metric found for draft") {
      return NextResponse.json(
        { error: "Collect metrics for this draft before recording conversions." },
        { status: 404 },
      );
    }
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Unable to record conversion event" },
      { status: 500 },
    );
  }
}
