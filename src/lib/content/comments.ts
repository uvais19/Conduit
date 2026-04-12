import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { contentDrafts, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Draft Comments — collaborative discussion threads on drafts.
 */
export const draftComments = pgTable("draft_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  draftId: uuid("draft_id")
    .references(() => contentDrafts.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id"), // For threaded replies
  content: text("content").notNull(),
  mentions: text("mentions").array(), // Array of user IDs mentioned with @
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DraftComment = {
  id: string;
  draftId: string;
  userId: string;
  parentId: string | null;
  content: string;
  mentions: string[] | null;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
};

/** Get comments for a draft */
export async function getDraftComments(draftId: string) {
  return db
    .select({
      id: draftComments.id,
      draftId: draftComments.draftId,
      userId: draftComments.userId,
      parentId: draftComments.parentId,
      content: draftComments.content,
      mentions: draftComments.mentions,
      createdAt: draftComments.createdAt,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(draftComments)
    .leftJoin(users, eq(draftComments.userId, users.id))
    .where(eq(draftComments.draftId, draftId))
    .orderBy(desc(draftComments.createdAt));
}

/** Add a comment */
export async function addComment(input: {
  draftId: string;
  userId: string;
  content: string;
  parentId?: string;
  mentions?: string[];
}) {
  const [row] = await db
    .insert(draftComments)
    .values({
      draftId: input.draftId,
      userId: input.userId,
      content: input.content,
      parentId: input.parentId ?? null,
      mentions: input.mentions ?? null,
    })
    .returning();
  return row;
}

/** Delete a comment */
export async function deleteComment(commentId: string, userId: string) {
  await db
    .delete(draftComments)
    .where(eq(draftComments.id, commentId));
}
