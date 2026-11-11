import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { decideLoginClaim, normalizeEmail } from "@/lib/auth/login-claim";
import type { UserRole } from "@/lib/types";

type Permission =
  | "manage_workspace"
  | "invite_members"
  | "connect_platforms"
  | "edit_manifesto"
  | "generate_content"
  | "edit_drafts"
  | "submit_for_approval"
  | "approve_content"
  | "view_analytics"
  | "approve_strategy";

type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: UserRole;
    tenantId: string;
  };
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "manage_workspace",
    "invite_members",
    "connect_platforms",
    "edit_manifesto",
    "generate_content",
    "edit_drafts",
    "submit_for_approval",
    "approve_content",
    "view_analytics",
    "approve_strategy",
  ],
  creator: [
    "edit_manifesto",
    "generate_content",
    "edit_drafts",
    "submit_for_approval",
    "view_analytics",
  ],
  approver: ["approve_content", "view_analytics", "approve_strategy"],
};

function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  return (
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  );
}

async function ensureAppUser(
  clerkId: string,
  email: string,
  name: string,
  image?: string | null
) {
  const selectFields = {
    id: users.id,
    role: users.role,
    tenantId: users.tenantId,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
  };
  const normalized = normalizeEmail(email);

  const [byClerk] = await db
    .select(selectFields)
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  const [byEmail] = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  const claim = decideLoginClaim(byClerk ? { clerkId } : null, byEmail ?? null);

  if (claim === "use_existing" && byClerk) {
    return byClerk;
  }

  if (claim === "claim_placeholder") {
    const [claimed] = await db
      .update(users)
      .set({
        clerkId,
        email: normalized,
        name,
        ...(image ? { avatarUrl: image } : {}),
        updatedAt: new Date(),
      })
      .where(and(sql`lower(${users.email}) = ${normalized}`, isNull(users.clerkId)))
      .returning(selectFields);
    if (claimed) return claimed;

    const [raced] = await db
      .select(selectFields)
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    if (raced) return raced;
  }

  if (claim === "email_taken") {
    throw new Error("Email already belongs to another account");
  }

  // First login: provision a tenant and create the user
  const [tenant] = await db
    .insert(tenants)
    .values({ name: "My Business" })
    .returning({ id: tenants.id });

  const [createdUser] = await db
    .insert(users)
    .values({
      clerkId,
      tenantId: tenant.id,
      email: normalized,
      name,
      avatarUrl: image ?? undefined,
      role: "admin",
    })
    .returning(selectFields);

  return createdUser;
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requireAuth(): Promise<AuthSession> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const clerkUser = await currentUser();
  const email = getPrimaryEmail(clerkUser);

  if (!clerkUser || !email) {
    throw new Error("Unauthorized");
  }

  const name =
    clerkUser.fullName ??
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ??
    "User";

  const appUser = await ensureAppUser(userId, email, name, clerkUser.imageUrl);

  return {
    user: {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      image: appUser.avatarUrl,
      role: appUser.role as UserRole,
      tenantId: appUser.tenantId,
    },
  };
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}
