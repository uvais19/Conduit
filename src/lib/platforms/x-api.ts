import type { ContentDraftRecord } from "@/lib/content/types";
import { platformRequest } from "@/lib/platforms/http";

const X_API_BASE = process.env.X_API_BASE_URL ?? "https://api.twitter.com/2";

export async function fetchXMe(accessToken: string): Promise<{
  id: string;
  username: string;
  name: string;
}> {
  const response = await platformRequest<{ data?: { id?: string; username?: string; name?: string } }>({
    platform: "x",
    url: `${X_API_BASE}/users/me`,
    token: accessToken,
  });
  const id = response.data?.id ?? "";
  if (!id) throw new Error("X profile response did not include an id");
  return {
    id,
    username: response.data?.username ?? "",
    name: response.data?.name ?? "X Account",
  };
}

export async function publishXPost(params: {
  accessToken: string;
  draft: ContentDraftRecord;
}): Promise<{ id: string }> {
  const mediaUrls = params.draft.mediaUrls.filter((url) => url.trim().length > 0);
  const text = `${params.draft.caption}\n\n${params.draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}${
    mediaUrls.length ? `\n\n${mediaUrls.join(" ")}` : ""
  }`.trim();
  const response = await platformRequest<{ data?: { id?: string } }>({
    platform: "x",
    url: `${X_API_BASE}/tweets`,
    method: "POST",
    token: params.accessToken,
    body: { text: text.slice(0, 280) },
  });
  const id = response.data?.id ?? "";
  if (!id) throw new Error("X publish response did not include an id");
  return { id };
}

export async function fetchXTweetMetrics(params: {
  accessToken: string;
  tweetId: string;
}): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}> {
  const response = await platformRequest<{
    data?: {
      public_metrics?: {
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
        impression_count?: number;
      };
    };
  }>({
    platform: "x",
    url: `${X_API_BASE}/tweets/${params.tweetId}`,
    token: params.accessToken,
    query: { "tweet.fields": "public_metrics" },
  });
  const m = response.data?.public_metrics;
  const impressions = m?.impression_count ?? 0;
  return {
    impressions,
    reach: impressions,
    likes: m?.like_count ?? 0,
    comments: m?.reply_count ?? 0,
    shares: m?.retweet_count ?? 0,
    saves: 0,
    clicks: 0,
  };
}
