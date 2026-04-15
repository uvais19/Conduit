import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { getGaLink, setGaLink } from "@/lib/analytics/ga-link";
import { logActivity } from "@/lib/audit-log";

const requestSchema = z.object({
  propertyId: z.string().min(1),
  measurementId: z.string().optional(),
  apiSecret: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("view_analytics");
    const link = getGaLink(session.user.tenantId);
    return NextResponse.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to read GA link" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("view_analytics");
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid GA link payload" },
        { status: 400 }
      );
    }

    const link = setGaLink(session.user.tenantId, parsed.data);
    await logActivity({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "analytics.collected",
      resourceType: "ga-link",
      metadata: { propertyId: parsed.data.propertyId },
    });
    return NextResponse.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to link GA property" }, { status: 500 });
  }
}
