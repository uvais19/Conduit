import { getPlatformConnection } from "@/lib/platforms/store";
import {
  getFacebookPageInsights,
  getInstagramAccountInsights,
  resolveInstagramUserId,
} from "@/lib/platforms/meta-graph";
type FollowerSnapshot = {
  date: string;
  platform: "instagram" | "facebook" | "linkedin";
  followers: number;
  source: "live" | "fallback";
};

const followerSnapshotsByTenant = new Map<string, FollowerSnapshot[]>();

export async function collectLiveAudienceBreakdown(tenantId: string): Promise<{
  demographics: string | null;
  psychographics: string | null;
  source: "live" | "fallback";
}> {
  // Instagram has the richest audience demographics in our currently supported APIs.
  const instagram = getPlatformConnection(tenantId, "instagram");
  if (instagram) {
    const igUserId = await resolveInstagramUserId(instagram);
    if (igUserId) {
      const data = await getInstagramAccountInsights({
        igUserId,
        accessToken: instagram.accessToken,
      }).catch(() => null);
      if (data) {
        const topGenderAge = Object.entries(data.audienceGenderAge)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([bucket, count]) => `${bucket} (${count})`)
          .join(", ");
        const topCountries = Object.entries(data.audienceCountry)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([country, count]) => `${country} (${count})`)
          .join(", ");

        return {
          demographics: topGenderAge || null,
          psychographics: topCountries || null,
          source: "live",
        };
      }
    }
  }

  const facebook = getPlatformConnection(tenantId, "facebook");
  if (facebook?.platformPageId) {
    const page = await getFacebookPageInsights({
      pageId: facebook.platformPageId,
      accessToken: facebook.accessToken,
    }).catch(() => null);
    if (page) {
      const topCountries = Object.entries(page.pageFansCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([country, count]) => `${country} (${count})`)
        .join(", ");
      return {
        demographics: null,
        psychographics: topCountries || null,
        source: "live",
      };
    }
  }

  return { demographics: null, psychographics: null, source: "fallback" };
}

export async function collectFollowerSnapshot(
  tenantId: string
): Promise<FollowerSnapshot[]> {
  const snapshots: FollowerSnapshot[] = [];
  const now = new Date().toISOString().slice(0, 10);

  const instagram = getPlatformConnection(tenantId, "instagram");
  if (instagram) {
    const igUserId = await resolveInstagramUserId(instagram);
    if (igUserId) {
      const profile = await getInstagramAccountInsights({
        igUserId,
        accessToken: instagram.accessToken,
      }).catch(() => null);
      if (profile) {
        snapshots.push({
          date: now,
          platform: "instagram",
          followers: profile.followersCount,
          source: "live",
        });
      }
    }
  }

  const facebook = getPlatformConnection(tenantId, "facebook");
  if (facebook?.platformPageId) {
    const page = await getFacebookPageInsights({
      pageId: facebook.platformPageId,
      accessToken: facebook.accessToken,
    }).catch(() => null);
    if (page) {
      snapshots.push({
        date: now,
        platform: "facebook",
        followers: page.followersCount,
        source: "live",
      });
    }
  }

  if (snapshots.length > 0) {
    const existing = followerSnapshotsByTenant.get(tenantId) ?? [];
    const filtered = existing.filter(
      (item) => !snapshots.some((snapshot) => snapshot.platform === item.platform && snapshot.date === item.date)
    );
    followerSnapshotsByTenant.set(tenantId, [...filtered, ...snapshots]);
  }

  return followerSnapshotsByTenant.get(tenantId) ?? [];
}
