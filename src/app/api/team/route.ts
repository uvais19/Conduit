import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimitResponse } from "@/lib/rate-limit";
import { logActivity } from "@/lib/audit-log";

/** GET /api/team — list team members */
export async function GET() {
  try {
    const { user } = await requireAuth();
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    return NextResponse.json({ members });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/team — invite a member (create user with email + role) */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`team-invite:${user.id}`, { limit: 10, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    if (!["creator", "approver"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists in tenant
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, user.tenantId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "User already in workspace" }, { status: 409 });
    }

    // Create the user placeholder (they'll link via Clerk on first login)
    const [created] = await db
      .insert(users)
      .values({
        tenantId: user.tenantId,
        email,
        name: email.split("@")[0],
        role: role as "creator" | "approver",
      })
      .returning();

    await logActivity({
      tenantId: user.tenantId,
      userId: user.id,
      action: "team.member_invited",
      resourceType: "user",
      resourceId: created.id,
      metadata: { email, role },
    });

    return NextResponse.json({ ok: true, member: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/team — change role */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();
    const { userId, role } = body as { userId?: string; role?: string };

    if (!userId || !role || !["admin", "creator", "approver"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ role: role as "admin" | "creator" | "approver", updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, user.tenantId)));

    await logActivity({
      tenantId: user.tenantId,
      userId: user.id,
      action: "team.role_changed",
      resourceType: "user",
      resourceId: userId,
      metadata: { newRole: role },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/team — remove member */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    await db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, user.tenantId)));

    await logActivity({
      tenantId: user.tenantId,
      userId: user.id,
      action: "team.member_removed",
      resourceType: "user",
      resourceId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
