import { db } from "@/lib/db";
import { platformPosts, platformAnalyses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Platform, FetchedPost, PostAnalysis } from "@/lib/types";

export async function saveFetchedPosts(
  tenantId: string,
  posts: FetchedPost[]
): Promise<void> {
  if (posts.length === 0) return;

  // Clear previous posts for this tenant + platform before inserting fresh ones
  const platform = posts[0].platform;
  await db
    .delete(platformPosts)
    .where(
      and(
        eq(platformPosts.tenantId, tenantId),
        eq(platformPosts.platform, platform)
      )
    );

  await db.insert(platformPosts).values(
    posts.map((p) => ({
      tenantId,
      platform: p.platform,
      platformPostId: p.platformPostId,
      content: p.content,
      mediaType: p.mediaType as
        | "image"
        | "carousel"
        | "video"
        | "story"
        | "text-only"
        | undefined,
      postedAt: new Date(p.postedAt),
      impressions: p.impressions,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      engagementRate: String(p.engagementRate),
    }))
  );
}

export async function getFetchedPosts(
  tenantId: string,
  platform?: Platform
): Promise<FetchedPost[]> {
  const conditions = [eq(platformPosts.tenantId, tenantId)];
  if (platform) {
    conditions.push(eq(platformPosts.platform, platform));
  }

  const rows = await db
    .select()
    .from(platformPosts)
    .where(and(...conditions));

  return rows.map((r) => ({
    platformPostId: r.platformPostId,
    platform: r.platform as Platform,
    content: r.content ?? "",
    mediaType: r.mediaType ?? undefined,
    postedAt: r.postedAt?.toISOString() ?? new Date().toISOString(),
    impressions: r.impressions ?? 0,
    reach: r.reach ?? 0,
    likes: r.likes ?? 0,
    comments: r.comments ?? 0,
    shares: r.shares ?? 0,
    engagementRate: Number(r.engagementRate ?? 0),
  }));
}

export async function saveAnalysis(
  tenantId: string,
  platform: Platform,
  data: PostAnalysis,
  postsAnalysed: number
): Promise<void> {
  // Replace previous analysis for this tenant + platform
  await db
    .delete(platformAnalyses)
    .where(
      and(
        eq(platformAnalyses.tenantId, tenantId),
        eq(platformAnalyses.platform, platform)
      )
    );

  await db.insert(platformAnalyses).values({
    tenantId,
    platform,
    data,
    postsAnalysed,
  });
}

export async function getAnalyses(
  tenantId: string
): Promise<{ platform: Platform; data: PostAnalysis; postsAnalysed: number; createdAt: Date }[]> {
  const rows = await db
    .select()
    .from(platformAnalyses)
    .where(eq(platformAnalyses.tenantId, tenantId));

  return rows.map((r) => ({
    platform: r.platform as Platform,
    data: r.data as PostAnalysis,
    postsAnalysed: r.postsAnalysed,
    createdAt: r.createdAt,
  }));
}

export async function hasAnalyses(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ id: platformAnalyses.id })
    .from(platformAnalyses)
    .where(eq(platformAnalyses.tenantId, tenantId))
    .limit(1);

  return rows.length > 0;
}
