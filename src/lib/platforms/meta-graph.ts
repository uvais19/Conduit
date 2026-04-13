/**
 * Meta Graph API (Facebook Pages + Instagram Business) — HTTP helpers.
 * Used for real publish, metrics, and post import when credentials are valid.
 */

import type { PlatformConnection } from "@/lib/platforms/store";

export const META_GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type GraphErrorBody = {
  error?: { message?: string; code?: number; type?: string };
};

export class MetaGraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "MetaGraphError";
  }
}

export async function graphGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json()) as T & GraphErrorBody;
  if (!res.ok || (json as GraphErrorBody).error) {
    const msg =
      (json as GraphErrorBody).error?.message ??
      `Graph request failed (${res.status})`;
    throw new MetaGraphError(msg, res.status, json);
  }
  return json;
}

export async function graphPostForm<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = `${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, String(v));
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as T & GraphErrorBody;
  if (!res.ok || (json as GraphErrorBody).error) {
    const msg =
      (json as GraphErrorBody).error?.message ??
      `Graph POST failed (${res.status})`;
    throw new MetaGraphError(msg, res.status, json);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Page + Instagram Business account
// ---------------------------------------------------------------------------

export async function getInstagramBusinessAccountId(
  pageId: string,
  accessToken: string
): Promise<string | null> {
  const data = await graphGet<{ instagram_business_account?: { id: string } }>(
    `/${pageId}`,
    { fields: "instagram_business_account", access_token: accessToken }
  );
  return data.instagram_business_account?.id ?? null;
}

export async function resolveInstagramUserId(
  connection: PlatformConnection
): Promise<string | null> {
  const { platformPageId, platformUserId, accessToken } = connection;
  if (!platformPageId || !accessToken) return null;
  if (platformUserId?.trim()) return platformUserId.trim();
  return getInstagramBusinessAccountId(platformPageId, accessToken);
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

function buildCaption(caption: string, hashtags: string[]): string {
  const tagLine =
    hashtags.length > 0
      ? (caption.includes("#") ? "" : "\n\n") +
        hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  const full = `${caption}${tagLine}`.trim();
  return full.length > 2200 ? full.slice(0, 2197) + "…" : full;
}

export async function publishInstagramFeedPhoto(params: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  const caption = buildCaption(params.caption, params.hashtags);
  const container = await graphPostForm<{ id: string }>(
    `/${params.igUserId}/media`,
    {
      image_url: params.imageUrl,
      caption,
      access_token: params.accessToken,
    }
  );
  const published = await graphPostForm<{ id: string; post_id?: string }>(
    `/${params.igUserId}/media_publish`,
    {
      creation_id: container.id,
      access_token: params.accessToken,
    }
  );
  return { id: published.post_id ?? published.id };
}

export async function publishFacebookPagePhoto(params: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
  message: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  const message = buildCaption(params.message, params.hashtags);
  const out = await graphPostForm<{ id: string; post_id?: string }>(
    `/${params.pageId}/photos`,
    {
      url: params.imageUrl,
      caption: message,
      published: true,
      access_token: params.accessToken,
    }
  );
  return { id: out.post_id ?? out.id };
}

export async function publishFacebookFeedPost(params: {
  pageId: string;
  accessToken: string;
  message: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  const message = buildCaption(params.message, params.hashtags);
  const out = await graphPostForm<{ id: string }>(`/${params.pageId}/feed`, {
    message,
    access_token: params.accessToken,
  });
  return out;
}

// ---------------------------------------------------------------------------
// Recent posts (import)
// ---------------------------------------------------------------------------

type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
};

export async function listInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit: number
): Promise<IgMediaItem[]> {
  const data = await graphGet<{ data?: IgMediaItem[] }>(`/${igUserId}/media`, {
    fields:
      "id,caption,media_type,timestamp,like_count,comments_count,permalink",
    limit,
    access_token: accessToken,
  });
  return data.data ?? [];
}

type IgInsightRow = { name: string; values?: { value?: number }[] };

export async function getInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<{
  impressions: number;
  reach: number;
  saves: number;
  engagement: number;
}> {
  try {
    const data = await graphGet<{ data?: IgInsightRow[] }>(
      `/${mediaId}/insights`,
      {
        metric: "impressions,reach,saved,engagement",
        access_token: accessToken,
      }
    );
    const map = new Map<string, number>();
    for (const row of data.data ?? []) {
      const v = row.values?.[0]?.value ?? 0;
      map.set(row.name, v);
    }
    return {
      impressions: map.get("impressions") ?? 0,
      reach: map.get("reach") ?? 0,
      saves: map.get("saved") ?? 0,
      engagement: map.get("engagement") ?? 0,
    };
  } catch {
    return { impressions: 0, reach: 0, saves: 0, engagement: 0 };
  }
}

type FbPostItem = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
};

export async function listFacebookPagePosts(
  pageId: string,
  accessToken: string,
  limit: number
): Promise<FbPostItem[]> {
  const data = await graphGet<{ data?: FbPostItem[] }>(`/${pageId}/posts`, {
    fields: "id,message,created_time,permalink_url",
    limit,
    access_token: accessToken,
  });
  return data.data ?? [];
}

type FbPostDetail = {
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
};

export async function getFacebookPostObject(
  postId: string,
  accessToken: string
): Promise<FbPostDetail> {
  return graphGet(`/${postId}`, {
    fields: "likes.summary(true),comments.summary(true),shares",
    access_token: accessToken,
  });
}

type FbInsightRow = { name: string; values?: { value?: number }[] };

export async function getFacebookPostInsights(
  postId: string,
  accessToken: string
): Promise<{ impressions: number; reach: number }> {
  try {
    const data = await graphGet<{ data?: FbInsightRow[] }>(
      `/${postId}/insights`,
      {
        metric: "post_impressions,post_impressions_unique",
        access_token: accessToken,
      }
    );
    const map = new Map<string, number>();
    for (const row of data.data ?? []) {
      map.set(row.name, row.values?.[0]?.value ?? 0);
    }
    return {
      impressions: map.get("post_impressions") ?? 0,
      reach: map.get("post_impressions_unique") ?? 0,
    };
  } catch {
    return { impressions: 0, reach: 0 };
  }
}

// ---------------------------------------------------------------------------
// Metrics for a published draft (by platform post id on the draft)
// ---------------------------------------------------------------------------

export async function metricsForInstagramMedia(
  mediaId: string,
  accessToken: string
): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}> {
  const media = await graphGet<{
    like_count?: number;
    comments_count?: number;
  }>(`/${mediaId}`, {
    fields: "like_count,comments_count",
    access_token: accessToken,
  });
  const ins = await getInstagramMediaInsights(mediaId, accessToken);
  const likes = media.like_count ?? 0;
  const comments = media.comments_count ?? 0;
  const impressions = ins.impressions || ins.reach || likes + comments;
  const reach = ins.reach || impressions;
  const saves = ins.saves;
  const shares = Math.max(0, ins.engagement - likes - comments - saves);

  return {
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    clicks: 0,
  };
}

export async function metricsForFacebookPost(
  postId: string,
  accessToken: string
): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}> {
  const obj = await getFacebookPostObject(postId, accessToken);
  const ins = await getFacebookPostInsights(postId, accessToken);
  const likes = obj.likes?.summary?.total_count ?? 0;
  const comments = obj.comments?.summary?.total_count ?? 0;
  const shares = obj.shares?.count ?? 0;
  const impressions = ins.impressions || likes + comments + shares;
  const reach = ins.reach || impressions;

  return {
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves: 0,
    clicks: 0,
  };
}
