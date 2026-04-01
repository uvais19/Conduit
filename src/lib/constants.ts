export const APP_NAME = "Conduit";

export const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "gbp",
] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  gbp: "Google Business Profile",
};

export const PLATFORM_CHAR_LIMITS: Record<(typeof PLATFORMS)[number], number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  x: 280,
  gbp: 1500,
};

export const PLATFORM_HASHTAG_LIMITS: Record<
  (typeof PLATFORMS)[number],
  { min: number; max: number }
> = {
  instagram: { min: 20, max: 30 },
  facebook: { min: 2, max: 5 },
  linkedin: { min: 3, max: 5 },
  x: { min: 1, max: 3 },
  gbp: { min: 0, max: 0 },
};

export const DRAFT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  "in-review": "In Review",
  "revision-requested": "Revision Requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  creator: "Content Creator",
  approver: "Approver",
};
