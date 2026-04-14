import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { contentDrafts, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

// ============================================================
//  Draft Versioning — tracks every edit to a draft for history.
// ============================================================

export const draftVersions = pgTable("draft_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  draftId: uuid("draft_id")
    .references(() => contentDrafts.id, { onDelete: "cascade" })
    .notNull(),
  version: text("version").notNull(), // e.g. "v1", "v2"
  caption: text("caption").notNull(),
  hashtags: jsonb("hashtags"), // string[]
  cta: text("cta"),
  editedBy: uuid("edited_by").references(() => users.id),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DraftVersion = typeof draftVersions.$inferSelect;

/** Get the version history of a draft. */
export async function getDraftVersions(draftId: string): Promise<DraftVersion[]> {
  return db
    .select()
    .from(draftVersions)
    .where(eq(draftVersions.draftId, draftId))
    .orderBy(desc(draftVersions.createdAt));
}

/** One version row scoped to tenant (via owning draft). */
export async function getDraftVersionForTenant(
  versionId: string,
  tenantId: string
): Promise<DraftVersion | null> {
  const rows = await db
    .select({ v: draftVersions })
    .from(draftVersions)
    .innerJoin(contentDrafts, eq(draftVersions.draftId, contentDrafts.id))
    .where(and(eq(draftVersions.id, versionId), eq(contentDrafts.tenantId, tenantId)))
    .limit(1);

  return rows[0]?.v ?? null;
}

/** Save a new version snapshot. Automatically increments version number. */
export async function saveDraftVersion(params: {
  draftId: string;
  caption: string;
  hashtags?: string[];
  cta?: string;
  editedBy?: string;
  changeDescription?: string;
}): Promise<DraftVersion> {
  const existing = await db
    .select({ id: draftVersions.id })
    .from(draftVersions)
    .where(eq(draftVersions.draftId, params.draftId));

  const nextVersion = `v${existing.length + 1}`;

  const [version] = await db
    .insert(draftVersions)
    .values({
      draftId: params.draftId,
      version: nextVersion,
      caption: params.caption,
      hashtags: params.hashtags ?? [],
      cta: params.cta,
      editedBy: params.editedBy,
      changeDescription: params.changeDescription,
    })
    .returning();

  return version;
}
