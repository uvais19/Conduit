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
  "x",
  "gbp",
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

export const proposalTypeEnum = pgEnum("proposal_type", [
  "pillar_change",
  "schedule_change",
  "tone_change",
  "format_change",
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

export const fileTypeEnum = pgEnum("file_type", ["pdf", "docx", "image"]);

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
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("creator"),
  avatarUrl: text("avatar_url"),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
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

export const contentDrafts = pgTable("content_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  strategyId: uuid("strategy_id").references(() => contentStrategies.id),
  platform: platformEnum("platform").notNull(),
  pillar: text("pillar"),
  caption: text("caption").notNull(),
  hashtags: text("hashtags").array(),
  cta: text("cta"),
  mediaUrls: text("media_urls").array(),
  mediaType: mediaTypeEnum("media_type").notNull().default("text-only"),
  carouselData: jsonb("carousel_data"), // Array of carousel slides
  threadData: jsonb("thread_data"), // Array of thread tweets
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
