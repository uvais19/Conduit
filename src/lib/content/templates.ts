import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { tenants, users } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";

/**
 * Content Templates — save and reuse high-performing post structures.
 */
export const contentTemplates = pgTable("content_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform").notNull(),
  pillar: text("pillar"),
  captionTemplate: text("caption_template").notNull(),
  hashtagTemplate: text("hashtag_template").array(),
  ctaTemplate: text("cta_template"),
  mediaType: text("media_type"),
  category: text("category"), // e.g. "product-launch", "testimonial", "educational"
  usageCount: integer("usage_count").default(0),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ContentTemplate = {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  pillar: string | null;
  captionTemplate: string;
  hashtagTemplate: string[] | null;
  ctaTemplate: string | null;
  mediaType: string | null;
  category: string | null;
  usageCount: number;
  createdAt: string;
};

/** List templates for a tenant */
export async function listTemplates(tenantId: string) {
  return db
    .select()
    .from(contentTemplates)
    .where(eq(contentTemplates.tenantId, tenantId))
    .orderBy(desc(contentTemplates.updatedAt));
}

/** Create a template */
export async function createTemplate(
  tenantId: string,
  input: {
    name: string;
    description?: string;
    platform: string;
    pillar?: string;
    captionTemplate: string;
    hashtagTemplate?: string[];
    ctaTemplate?: string;
    mediaType?: string;
    category?: string;
    createdBy?: string;
  },
) {
  const [row] = await db
    .insert(contentTemplates)
    .values({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      platform: input.platform,
      pillar: input.pillar ?? null,
      captionTemplate: input.captionTemplate,
      hashtagTemplate: input.hashtagTemplate ?? null,
      ctaTemplate: input.ctaTemplate ?? null,
      mediaType: input.mediaType ?? null,
      category: input.category ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

/** Delete a template */
export async function deleteTemplate(tenantId: string, templateId: string) {
  await db
    .delete(contentTemplates)
    .where(
      and(
        eq(contentTemplates.id, templateId),
        eq(contentTemplates.tenantId, tenantId),
      ),
    );
}

/** Increment usage count */
export async function incrementTemplateUsage(templateId: string) {
  const rows = await db
    .select({ usageCount: contentTemplates.usageCount })
    .from(contentTemplates)
    .where(eq(contentTemplates.id, templateId))
    .limit(1);
  if (rows.length > 0) {
    await db
      .update(contentTemplates)
      .set({ usageCount: (rows[0].usageCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(contentTemplates.id, templateId));
  }
}
