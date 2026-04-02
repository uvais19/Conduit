import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
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

async function ensureAppUser(email: string, name: string, image?: string | null) {
  const [existing] = await db
    .select({
      id: users.id,
      role: users.role,
      tenantId: users.tenantId,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: "My Business" })
    .returning({ id: tenants.id });

  const [createdUser] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email,
      name,
      avatarUrl: image ?? undefined,
      role: "admin",
      emailVerified: new Date(),
    })
    .returning({
      id: users.id,
      role: users.role,
      tenantId: users.tenantId,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    });

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

  const appUser = await ensureAppUser(email, name, clerkUser.imageUrl);

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
