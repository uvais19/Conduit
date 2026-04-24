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
  /** Canonical site URL from onboarding (https). Optional for older saved manifestos. */
  websiteUrl: z.string().url().optional(),
  visualStyle: z.string().optional(),
  socialMediaGoals: z.array(z.string()),
  keyMessages: z.array(z.string()),
});

export type BrandManifesto = z.infer<typeof brandManifestoSchema>;

export type OnBrandScoreSource = "live" | "recomputed" | "fallback";

export type OnBrandScore = {
  overallScore: number;
  toneScore: number;
  messageAlignmentScore: number;
  guidelinesScore: number;
  source: OnBrandScoreSource;
  computedAt: string;
};

export type BrandComplianceSeverity = "error" | "warning" | "info";

export type BrandComplianceIssue = {
  severity: BrandComplianceSeverity;
  category:
    | "tone"
    | "banned_word"
    | "missing_disclosure"
    | "off_brand"
    | "guideline_violation"
    | "length";
  message: string;
  suggestion: string;
  blocking: boolean;
};

export type BrandComplianceResult = {
  blockingErrors: BrandComplianceIssue[];
  warnings: BrandComplianceIssue[];
  infos: BrandComplianceIssue[];
  missingDisclosures: string[];
  autoFixSuggestions: string[];
  canProceed: boolean;
};

// ============================================================
// Content Strategy
// ============================================================

export const platformType = z.enum([
  "instagram",
  "facebook",
  "linkedin",
]);
export type Platform = z.infer<typeof platformType>;

export const pillarRoleType = z.enum([
  "awareness-education",
  "trust-proof",
  "differentiation-pov",
  "community-engagement",
  "conversion-offer",
]);
export type PillarRole = z.infer<typeof pillarRoleType>;

function normalizePlatformList(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  const out: Platform[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const lower = entry.toLowerCase();
    if (lower === "instagram" || lower === "facebook" || lower === "linkedin") {
      out.push(lower);
    }
  }
  return out;
}

function normalizePillarRole(value: unknown): PillarRole {
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "awareness-education" || lower === "awareness" || lower === "education") {
      return "awareness-education";
    }
    if (lower === "trust-proof" || lower === "trust" || lower === "proof") {
      return "trust-proof";
    }
    if (
      lower === "differentiation-pov" ||
      lower === "differentiation" ||
      lower === "pov" ||
      lower === "point-of-view"
    ) {
      return "differentiation-pov";
    }
    if (
      lower === "community-engagement" ||
      lower === "community" ||
      lower === "engagement"
    ) {
      return "community-engagement";
    }
    if (lower === "conversion-offer" || lower === "conversion" || lower === "offer") {
      return "conversion-offer";
    }
  }
  // Backward-compatible default for older rows that do not yet carry role.
  return "awareness-education";
}

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
  /** Strategic role in the monthly funnel mix; must be one of the canonical 5 roles. */
  pillarRole: z.preprocess(normalizePillarRole, pillarRoleType),
  /** Strategic intent for this pillar (e.g. lead gen, brand awareness, authority). */
  primaryObjective: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "Brand alignment"),
    z.string().min(1)
  ),
  /** Primary channel where this pillar’s content formats fit best. */
  bestFitPlatform: z.preprocess((v) => {
    if (typeof v === "string") {
      const lower = v.toLowerCase();
      if (lower === "instagram" || lower === "facebook" || lower === "linkedin") return lower;
    }
    return "instagram";
  }, platformType),
  /** Optional secondary channels where this pillar can also be repurposed effectively. */
  alsoFitsPlatforms: z.preprocess(normalizePlatformList, z.array(platformType).default([])),
  percentage: z.number().min(0).max(100),
  exampleTopics: z.array(z.string()),
}).superRefine((pillar, ctx) => {
  const unique = new Set<Platform>();
  for (let i = 0; i < pillar.alsoFitsPlatforms.length; i += 1) {
    const platform = pillar.alsoFitsPlatforms[i]!;
    if (platform === pillar.bestFitPlatform) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alsoFitsPlatforms", i],
        message: "Secondary platforms cannot include bestFitPlatform.",
      });
    }
    if (unique.has(platform)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alsoFitsPlatforms", i],
        message: "Secondary platforms must be unique.",
      });
    } else {
      unique.add(platform);
    }
  }
  if (pillar.alsoFitsPlatforms.length > 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["alsoFitsPlatforms"],
      message: "Provide at most 2 secondary platforms.",
    });
  }
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
  /** Platform-specific execution (cadence, formats, hooks) for this week. */
  executionNotes: z.string().optional(),
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
// Platform Post Analysis
// ============================================================

export type FetchedPost = {
  platformPostId: string;
  platform: Platform;
  content: string;
  mediaType?: string;
  postedAt: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clicks?: number;
  engagementRate: number;
};

export type PerformanceByType = {
  type: string;
  postCount: number;
  avgEngagementRate: number;
  avgReach: number;
  verdict: "high" | "medium" | "low";
};

export type PerformanceByTopic = {
  topic: string;
  avgEngagementRate: number;
  avgReach: number;
  examplePost: string;
};

export type BestPostingTime = {
  day: string;
  timeRange: string;
  avgEngagementRate: number;
};

export type PostHighlight = {
  content: string;
  type: string;
  engagementRate: number;
  impressions: number;
  explanation: string;
};

export type GapItem = {
  area: string;
  current: string;
  desired: string;
  suggestion: string;
};

export type PostAnalysis = {
  detectedTone: string[];
  contentMix: { type: string; percentage: number }[];
  postingFrequency: {
    postsPerWeek: number;
    mostActiveDay: string;
    mostActiveTime: string;
  };
  performanceByType: PerformanceByType[];
  performanceByTopic: PerformanceByTopic[];
  bestPostingTimes: BestPostingTime[];
  topPosts: PostHighlight[];
  underperformingPosts: PostHighlight[];
  engagementSummary: {
    avgEngagementRate: number;
    totalReach: number;
    totalImpressions: number;
    bestPostType: string;
    worstPostType: string;
  };
  gapsVsManifesto: GapItem[];
  gapsVsStrategy: GapItem[];
  overallScore: number;
  keyInsights: string[];
  recommendations: string[];
  summary: string;
};

export const postAnalysisSchema = z.object({
  detectedTone: z.array(z.string()),
  contentMix: z.array(z.object({ type: z.string(), percentage: z.number() })),
  postingFrequency: z.object({
    postsPerWeek: z.number(),
    mostActiveDay: z.string(),
    mostActiveTime: z.string(),
  }),
  performanceByType: z.array(
    z.object({
      type: z.string(),
      postCount: z.number(),
      avgEngagementRate: z.number(),
      avgReach: z.number(),
      verdict: z.enum(["high", "medium", "low"]),
    })
  ),
  performanceByTopic: z.array(
    z.object({
      topic: z.string(),
      avgEngagementRate: z.number(),
      avgReach: z.number(),
      examplePost: z.string(),
    })
  ),
  bestPostingTimes: z.array(
    z.object({
      day: z.string(),
      timeRange: z.string(),
      avgEngagementRate: z.number(),
    })
  ),
  topPosts: z.array(
    z.object({
      content: z.string(),
      type: z.string(),
      engagementRate: z.number(),
      impressions: z.number(),
      explanation: z.string(),
    })
  ),
  underperformingPosts: z.array(
    z.object({
      content: z.string(),
      type: z.string(),
      engagementRate: z.number(),
      impressions: z.number(),
      explanation: z.string(),
    })
  ),
  engagementSummary: z.object({
    avgEngagementRate: z.number(),
    totalReach: z.number(),
    totalImpressions: z.number(),
    bestPostType: z.string(),
    worstPostType: z.string(),
  }),
  gapsVsManifesto: z.array(
    z.object({
      area: z.string(),
      current: z.string(),
      desired: z.string(),
      suggestion: z.string(),
    })
  ),
  gapsVsStrategy: z.array(
    z.object({
      area: z.string(),
      current: z.string(),
      desired: z.string(),
      suggestion: z.string(),
    })
  ),
  overallScore: z.number().min(0).max(100),
  keyInsights: z.array(z.string()),
  recommendations: z.array(z.string()),
  summary: z.string(),
});

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
