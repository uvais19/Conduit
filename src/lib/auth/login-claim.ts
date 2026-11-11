export type AccountMatch = {
  clerkId: string | null;
};

export type LoginClaim =
  | "use_existing"
  | "claim_placeholder"
  | "create_workspace"
  | "email_taken";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function decideLoginClaim(
  clerkMatch: AccountMatch | null,
  emailMatch: AccountMatch | null,
): LoginClaim {
  if (clerkMatch?.clerkId) return "use_existing";
  if (!emailMatch) return "create_workspace";
  if (emailMatch.clerkId === null) return "claim_placeholder";
  return "email_taken";
}
