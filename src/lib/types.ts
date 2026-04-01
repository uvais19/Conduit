import { z } from "zod";

// ============================================================
// Brand Manifesto
// ============================================================

export const toneSpectrumSchema = z.object({
  formal: z.number().min(1).max(10),
  playful: z.number().min(1).max(10),
  technical: z.number().min(1).max(10),
  emotional: z.number().min(1).max(10),
  provocative: z.number().min(1).max(10),
});

export const languageStyleSchema = z.object({
  sentenceLength: z.enum(["short", "medium", "long", "varied"]),
  vocabulary: z.enum(["simple", "professional", "technical", "mixed"]),
  perspective: z.enum(["first-person", "third-person", "mixed"]),
  emojiUsage: z.enum(["none", "minimal", "moderate", "heavy"]),
});

export const productServiceSchema = z.object({
  name: z.string(),
  description: z.string(),
  targetAudience: z.string().optional(),
});

export const audienceSchema = z.object({
  demographics: z.string(),
  psychographics: z.string(),
  painPoints: z.array(z.string()).optional(),
  desires: z.array(z.string()).optional(),
});

export const brandColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
});

export const brandManifestoSchema = z.object({
  businessName: z.string(),
  tagline: z.string().optional(),
  industry: z.string(),
  subIndustry: z.string().optional(),
  missionStatement: z.string().optional(),
  vision: z.string().optional(),
  coreValues: z.array(z.string()),
  productsServices: z.array(productServiceSchema),
  uniqueSellingPropositions: z.array(z.string()),
  primaryAudience: audienceSchema,
  secondaryAudiences: z.array(audienceSchema).optional(),
  voiceAttributes: z.array(z.string()),
  toneSpectrum: toneSpectrumSchema,
  languageStyle: languageStyleSchema,
  contentDos: z.array(z.string()),
  contentDonts: z.array(z.string()),
  bannedWords: z.array(z.string()).optional(),
  requiredDisclosures: z.array(z.string()).optional(),
  brandColors: brandColorsSchema.optional(),
  fontPreferences: z.array(z.string()).optional(),
  logoUrl: z.string().optional(),
  visualStyle: z.string().optional(),
  socialMediaGoals: z.array(z.string()),
  keyMessages: z.array(z.string()),
});

export type BrandManifesto = z.infer<typeof brandManifestoSchema>;

// ============================================================
// Content Strategy
// ============================================================

export const platformType = z.enum([
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "gbp",
]);
export type Platform = z.infer<typeof platformType>;

export const contentType = z.enum([
  "image",
  "carousel",
  "video",
  "story",
  "text-only",
  "thread",
  "poll",
  "reel",
]);

export const contentPillarSchema = z.object({
  name: z.string(),
  description: z.string(),
  percentage: z.number().min(0).max(100),
  exampleTopics: z.array(z.string()),
});

export const platformScheduleSchema = z.object({
  platform: platformType,
  postsPerWeek: z.number().min(1).max(21),
  preferredDays: z.array(z.string()),
  preferredTimes: z.array(z.string()),
  contentMix: z.array(
    z.object({
      type: contentType,
      percentage: z.number(),
    })
  ),
});

export const weeklyThemeSchema = z.object({
  weekNumber: z.number(),
  theme: z.string(),
  pillar: z.string(),
  keyMessage: z.string(),
});

export const contentStrategySchema = z.object({
  pillars: z.array(contentPillarSchema),
  schedule: z.array(platformScheduleSchema),
  weeklyThemes: z.array(weeklyThemeSchema),
  monthlyGoals: z.array(
    z.object({
      metric: z.string(),
      target: z.number(),
      platform: platformType,
    })
  ),
});

export type ContentStrategy = z.infer<typeof contentStrategySchema>;

// ============================================================
// User Roles
// ============================================================

export const userRole = z.enum(["admin", "creator", "approver"]);
export type UserRole = z.infer<typeof userRole>;

export const draftStatus = z.enum([
  "draft",
  "in-review",
  "revision-requested",
  "approved",
  "scheduled",
  "published",
  "failed",
]);
export type DraftStatus = z.infer<typeof draftStatus>;

// ============================================================
// API Request/Response Types
// ============================================================

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(1, "Business name is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
