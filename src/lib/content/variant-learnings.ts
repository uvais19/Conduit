import { db } from "@/lib/db";
import { variantLearnings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Platform } from "@/lib/types";

export type VariantLearning = {
  id: string;
  tenantId: string;
  platform: Platform;
  winningAngle: string;
  margin: number;
  sampleSize: number;
  createdAt: Date;
};

export async function saveVariantLearning(learning: {
  tenantId: string;
  platform: Platform;
  winningAngle: string;
  margin: number;
  sampleSize: number;
}): Promise<void> {
  await db.insert(variantLearnings).values({
    tenantId: learning.tenantId,
    platform: learning.platform,
    winningAngle: learning.winningAngle,
    margin: learning.margin,
    sampleSize: learning.sampleSize,
  });
}

export async function getVariantLearnings(
  tenantId: string,
  platform: Platform
): Promise<VariantLearning[]> {
  const rows = await db
    .select()
    .from(variantLearnings)
    .where(
      and(
        eq(variantLearnings.tenantId, tenantId),
        eq(variantLearnings.platform, platform)
      )
    )
    .orderBy(desc(variantLearnings.createdAt))
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    platform: r.platform as Platform,
    winningAngle: r.winningAngle,
    margin: r.margin,
    sampleSize: r.sampleSize,
    createdAt: r.createdAt,
  }));
}
