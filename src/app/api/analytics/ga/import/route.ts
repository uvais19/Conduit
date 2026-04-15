import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getGaLink } from "@/lib/analytics/ga-link";
import { importGaSummary } from "@/lib/analytics/store";
import { logActivity } from "@/lib/audit-log";

const requestSchema = z.object({
  visits: z.number().nonnegative(),
  conversions: z.number().nonnegative(),
  revenue: z.number().nonnegative().default(0),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const link = getGaLink(session.user.tenantId);
    if (!link) {
      return NextResponse.json(
        { error: "Link a GA property before importing conversion summaries." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid GA import payload" },
        { status: 400 }
      );
    }

    await importGaSummary({
      tenantId: session.user.tenantId,
      visits: parsed.data.visits,
      conversions: parsed.data.conversions,
      revenue: parsed.data.revenue,
    });
    await logActivity({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "ga-import",
      metadata: parsed.data,
    });

    return NextResponse.json({
      ok: true,
      imported: parsed.data,
      linkedPropertyId: link.propertyId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to import GA summary" }, { status: 500 });
  }
}
