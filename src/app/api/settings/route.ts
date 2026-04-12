import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/settings — get workspace settings */
export async function GET() {
  try {
    const { user } = await requireAuth();

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Settings are stored as a JSON field or derived from tenant
    const settings = {
      workspaceName: tenant.name ?? "",
      timezone: (tenant as Record<string, unknown>).timezone ?? "UTC",
      defaultPlatform: (tenant as Record<string, unknown>).defaultPlatform ?? "instagram",
      weekStart: (tenant as Record<string, unknown>).weekStart ?? "Monday",
    };

    return NextResponse.json({ settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PUT /api/settings — update workspace settings */
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`settings:${user.id}`, { limit: 10, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();

    await db
      .update(tenants)
      .set({
        name: body.workspaceName ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, user.tenantId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
