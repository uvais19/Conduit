import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  boolean,
  integer,
  jsonb,
  decimal,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// Enums
// ============================================================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "creator",
  "approver",
]);

export const platformEnum = pgEnum("platform", [
  "instagram",
  "facebook",
  "linkedin",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "carousel",
  "video",
  "story",
  "text-only",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "draft",
  "in-review",
  "revision-requested",
  "approved",
  "scheduled",
  "published",
  "failed",
]);

export const variantLabelEnum = pgEnum("variant_label", ["A", "B", "C"]);

export const approvalActionEnum = pgEnum("approval_action", [
  "submitted",
  "approved",
  "revision-requested",
  "revised",
]);

export const strategyStatusEnum = pgEnum("strategy_status", [
  "draft",
  "active",
  "archived",
]);

export const calendarPlanStatusEnum = pgEnum("calendar_plan_status", [
  "active",
  "archived",
]);

export const proposalTypeEnum = pgEnum("proposal_type", [
  "pillar_change",
  "schedule_change",
  "tone_change",
  "format_change",
  "platform_format_shift",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "approved",
  "rejected",
]);

export const discoveryMethodEnum = pgEnum("discovery_method", [
  "ai-discovered",
  "manual",
]);

export const fileTypeEnum = pgEnum("file_type", ["pdf", "docx", "pptx", "image"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "draft_ready",
  "draft_approved",
  "revision_requested",
  "post_published",
  "post_failed",
  "analytics_summary",
  "optimization_proposal",
  "competitor_alert",
]);

export const publishJobStatusEnum = pgEnum("publish_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// ============================================================
// Tables
// ============================================================

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").unique(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("creator"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandManifestos = pgTable("brand_manifestos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  data: jsonb("data").notNull(), // Full BrandManifesto object
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformConnections = pgTable("platform_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum("platform").notNull(),
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  tokenExpiresAt: timestamp("token_expires_at"),
  platformUserId: text("platform_user_id"),
  platformPageId: text("platform_page_id"),
  connectedBy: uuid("connected_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentStrategies = pgTable("content_strategies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  data: jsonb("data").notNull(), // Full ContentStrategy object
  version: integer("version").notNull().default(1),
  status: strategyStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentCalendarPlans = pgTable(
  "content_calendar_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    strategyId: uuid("strategy_id").references(() => contentStrategies.id, {
      onDelete: "set null",
    }),
    strategyVersion: integer("strategy_version").notNull().default(1),
    month: text("month").notNull(), // YYYY-MM
    timezone: text("timezone").notNull().default("UTC"),
    data: jsonb("data").notNull(), // CalendarMonthPlan
    status: calendarPlanStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantMonthStatusUnique: uniqueIndex("content_calendar_plans_tenant_month_status_unique").on(
      table.tenantId,
      table.month,
      table.status
    ),
  })
);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentDrafts = pgTable("content_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  strategyId: uuid("strategy_id").references(() => contentStrategies.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id, {
    onDelete: "set null",
  }),
  platform: platformEnum("platform").notNull(),
  pillar: text("pillar"),
  caption: text("caption").notNull(),
  hashtags: text("hashtags").array(),
  cta: text("cta"),
  writerRationale: text("writer_rationale"),
  mediaUrls: text("media_urls").array(),
  mediaType: mediaTypeEnum("media_type").notNull().default("text-only"),
  carouselData: jsonb("carousel_data"), // Array of carousel slides
  threadData: jsonb("thread_data"), // Array of thread tweets
  visualPlanData: jsonb("visual_plan_data"), // objective, styleHint, imagePrompt, slide prompts, aspect
  variantGroup: uuid("variant_group"),
  variantLabel: variantLabelEnum("variant_label"),
  status: draftStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  platformPostId: text("platform_post_id"),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const approvalActions = pgTable("approval_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  draftId: uuid("draft_id")
    .references(() => contentDrafts.id, { onDelete: "cascade" })
    .notNull(),
  action: approvalActionEnum("action").notNull(),
  notes: text("notes"),
  actedBy: uuid("acted_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postAnalytics = pgTable("post_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  draftId: uuid("draft_id")
    .references(() => contentDrafts.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum("platform").notNull(),
  platformPostId: text("platform_post_id"),
  collectedAt: timestamp("collected_at").notNull(),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  clicks: integer("clicks").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 4 }),
  rawData: jsonb("raw_data"), // Full platform API response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const optimizationProposals = pgTable("optimization_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  proposalType: proposalTypeEnum("proposal_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reasoning: text("reasoning"),
  data: jsonb("data"), // Specific changes proposed
  status: proposalStatusEnum("status").notNull().default("pending"),
  proposedAt: timestamp("proposed_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
});

export const competitorProfiles = pgTable("competitor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  platform: platformEnum("platform").notNull(),
  profileUrl: text("profile_url"),
  discoveryMethod: discoveryMethodEnum("discovery_method")
    .notNull()
    .default("ai-discovered"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformPosts = pgTable("platform_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum("platform").notNull(),
  platformPostId: text("platform_post_id").notNull(),
  content: text("content"),
  mediaType: mediaTypeEnum("media_type"),
  postedAt: timestamp("posted_at"),
  impressions: integer("impressions"),
  reach: integer("reach"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 4 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformAnalyses = pgTable("platform_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum("platform").notNull(),
  data: jsonb("data").notNull(),
  postsAnalysed: integer("posts_analysed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publishJobs = pgTable("publish_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  draftId: uuid("draft_id")
    .references(() => contentDrafts.id, { onDelete: "cascade" })
    .notNull(),
  status: publishJobStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  scheduledFor: timestamp("scheduled_for").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastError: text("last_error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploadedDocuments = pgTable("uploaded_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  processed: boolean("processed").notNull().default(false),
  extractedData: jsonb("extracted_data"),
  uploadedBy: uuid("uploaded_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// Variant Learnings (A/B test results)
// ============================================================

export const variantLearnings = pgTable("variant_learnings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum("platform").notNull(),
  winningAngle: text("winning_angle").notNull(),
  margin: real("margin").notNull(),
  sampleSize: integer("sample_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
