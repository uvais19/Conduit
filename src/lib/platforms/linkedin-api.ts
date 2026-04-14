import type { ContentDraftRecord } from "@/lib/content/types";
import { platformRequest } from "@/lib/platforms/http";

const LINKEDIN_API_BASE = process.env.LINKEDIN_API_BASE_URL ?? "https://api.linkedin.com/v2";

type LinkedInProfile = {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
};

export async function fetchLinkedInProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
}> {
  const profile = await platformRequest<LinkedInProfile>({
    platform: "linkedin",
    url: `${LINKEDIN_API_BASE}/me`,
    token: accessToken,
  });

  const id = profile.id ?? "";
  const displayName = `${profile.localizedFirstName ?? ""} ${profile.localizedLastName ?? ""}`.trim();
  if (!id) throw new Error("LinkedIn profile response did not include an id");
  return { id, displayName: displayName || "LinkedIn Account" };
}

export async function publishLinkedInPost(params: {
  accessToken: string;
  authorUrn: string;
  draft: ContentDraftRecord;
}): Promise<{ id: string }> {
  const text = `${params.draft.caption}\n\n${params.draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`.trim();
  const payload = await platformRequest<{ id?: string }>({
    platform: "linkedin",
    url: `${LINKEDIN_API_BASE}/ugcPosts`,
    method: "POST",
    token: params.accessToken,
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
    body: {
      author: params.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    },
  });

  if (!payload.id) throw new Error("LinkedIn publish response did not include an id");
  return { id: payload.id };
}

type LinkedInShareStat = {
  totalShareStatistics?: {
    impressionCount?: number;
    clickCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
  };
};

export async function fetchLinkedInMetrics(params: {
  accessToken: string;
  authorUrn: string;
  postUrn: string;
}): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}> {
  const res = await platformRequest<{ elements?: LinkedInShareStat[] }>({
    platform: "linkedin",
    url: `${LINKEDIN_API_BASE}/organizationalEntityShareStatistics`,
    token: params.accessToken,
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
    query: {
      q: "organizationalEntity",
      organizationalEntity: params.authorUrn,
      shares: `List(${params.postUrn})`,
    },
  });
  const stats = res.elements?.[0]?.totalShareStatistics;
  return {
    impressions: stats?.impressionCount ?? 0,
    reach: stats?.impressionCount ?? 0,
    likes: stats?.likeCount ?? 0,
    comments: stats?.commentCount ?? 0,
    shares: stats?.shareCount ?? 0,
    saves: 0,
    clicks: stats?.clickCount ?? 0,
  };
}
