import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { rateLimitResponse } from "@/lib/rate-limit";
import { logActivity } from "@/lib/audit-log";
import { normalizeEmail } from "@/lib/auth/login-claim";

function teamError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

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
  } catch (error) {
    return teamError(error);
  }
}

/** POST /api/team — invite a member (create user with email + role) */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requirePermission("invite_members");

    const limited = rateLimitResponse(`team-invite:${user.id}`, { limit: 10, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { email: rawEmail, role } = body as { email?: string; role?: string };
    const email = rawEmail ? normalizeEmail(rawEmail) : "";

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    if (!["creator", "approver"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already belongs to a workspace" }, { status: 409 });
    }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/duplicate|unique/i.test(message)) {
      return NextResponse.json(
        { error: "Email already belongs to a workspace" },
        { status: 409 },
      );
    }
    return teamError(error);
  }
}

/** PATCH /api/team — change role */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requirePermission("manage_workspace");
    const body = await req.json();
    const { userId, role } = body as { userId?: string; role?: string };

    if (!userId || !role || !["admin", "creator", "approver"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
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
  } catch (error) {
    return teamError(error);
  }
}

/** DELETE /api/team — remove member */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requirePermission("manage_workspace");
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
  } catch (error) {
    return teamError(error);
  }
}
