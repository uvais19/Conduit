import { auth } from "./config";
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

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.user.role as UserRole, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}
