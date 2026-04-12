import { db } from "@/lib/db";
import { contentDrafts, postAnalytics } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface RecycleCandidate {
  draftId: string;
  platform: string;
  content: string;
  engagementScore: number;
  originalDate: string;
  suggestions: string[];
}

/**
 * Finds top-performing past content that can be recycled or repurposed.
 * Ranks by engagement score (likes + comments + shares + saves + clicks).
 */
export async function getRecycleCandidates(
  tenantId: string,
  limit = 10
): Promise<RecycleCandidate[]> {
  const rows = await db
    .select({
      draftId: contentDrafts.id,
      platform: contentDrafts.platform,
      content: contentDrafts.caption,
      scheduledAt: contentDrafts.scheduledAt,
      engagement: sql<number>`COALESCE(${postAnalytics.likes} + ${postAnalytics.comments} + ${postAnalytics.shares} + ${postAnalytics.saves} + ${postAnalytics.clicks}, 0)`,
    })
    .from(contentDrafts)
    .leftJoin(postAnalytics, eq(postAnalytics.draftId, contentDrafts.id))
    .where(
      and(
        eq(contentDrafts.tenantId, tenantId),
        eq(contentDrafts.status, "published")
      )
    )
    .orderBy(
      desc(
        sql`COALESCE(${postAnalytics.likes} + ${postAnalytics.comments} + ${postAnalytics.shares} + ${postAnalytics.saves} + ${postAnalytics.clicks}, 0)`
      )
    )
    .limit(limit);

  return rows.map((row) => ({
    draftId: row.draftId,
    platform: row.platform ?? "unknown",
    content: row.content ?? "",
    engagementScore: Number(row.engagement),
    originalDate: row.scheduledAt?.toISOString() ?? "",
    suggestions: generateRecycleSuggestions(row.platform ?? "unknown"),
  }));
}

function generateRecycleSuggestions(platform: string): string[] {
  const base = [
    "Update statistics and dates",
    "Add a fresh hook or opening line",
    "Include a new call-to-action",
  ];

  switch (platform) {
    case "instagram":
      return [
        ...base,
        "Turn into a carousel with key points",
        "Create a Reel version",
        "Reshare as a Story with poll sticker",
      ];
    case "linkedin":
      return [
        ...base,
        "Reformat as a document/carousel post",
        "Add a personal anecdote",
        "Turn into a poll question",
      ];
    case "x":
      return [
        ...base,
        "Break into a thread with deeper insights",
        "Quote-tweet with a new perspective",
        "Create a shorter, punchier version",
      ];
    case "facebook":
      return [
        ...base,
        "Add a question to spark discussion",
        "Pair with a new image or video",
        "Create a Facebook Story version",
      ];
    default:
      return base;
  }
}
