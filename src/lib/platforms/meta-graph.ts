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
    readonly body?: unknown,
    readonly code: "rate_limited" | "auth" | "forbidden" | "bad_request" | "upstream" = "upstream"
  ) {
    super(message);
    this.name = "MetaGraphError";
  }
}

function classifyGraphStatus(status: number): MetaGraphError["code"] {
  if (status === 400) return "bad_request";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  return "upstream";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function graphGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>,
  maxAttempts: number = 3
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const startedAt = Date.now();
    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const json = (await res.json()) as T & GraphErrorBody;
    const durationMs = Date.now() - startedAt;
    if (res.ok && !(json as GraphErrorBody).error) {
      console.info("[platform.meta] graph_get_ok", { path, attempt, durationMs });
      return json;
    }
    const msg =
      (json as GraphErrorBody).error?.message ??
      `Graph request failed (${res.status})`;
    const code = classifyGraphStatus(res.status);
    const retriable = code === "rate_limited" || res.status >= 500;
    console.warn("[platform.meta] graph_get_failed", {
      path,
      status: res.status,
      code,
      attempt,
      durationMs,
      retriable,
    });
    if (retriable && attempt < maxAttempts) {
      await sleep(Math.min(1500, 250 * 2 ** (attempt - 1)));
      continue;
    }
    throw new MetaGraphError(msg, res.status, json, code);
  }
  throw new MetaGraphError("Meta Graph request exhausted retries", 500);
}

export async function graphPostForm<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  maxAttempts: number = 3
): Promise<T> {
  const url = `${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, String(v));
  }
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const startedAt = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const json = (await res.json()) as T & GraphErrorBody;
    const durationMs = Date.now() - startedAt;
    if (res.ok && !(json as GraphErrorBody).error) {
      console.info("[platform.meta] graph_post_ok", { path, attempt, durationMs });
      return json;
    }
    const msg =
      (json as GraphErrorBody).error?.message ??
      `Graph POST failed (${res.status})`;
    const code = classifyGraphStatus(res.status);
    const retriable = code === "rate_limited" || res.status >= 500;
    console.warn("[platform.meta] graph_post_failed", {
      path,
      status: res.status,
      code,
      attempt,
      durationMs,
      retriable,
    });
    if (retriable && attempt < maxAttempts) {
      await sleep(Math.min(1500, 250 * 2 ** (attempt - 1)));
      continue;
    }
    throw new MetaGraphError(msg, res.status, json, code);
  }
  throw new MetaGraphError("Meta Graph POST exhausted retries", 500);
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

export async function getInstagramAccountInsights(params: {
  igUserId: string;
  accessToken: string;
}): Promise<{
  followersCount: number;
  audienceGenderAge: Record<string, number>;
  audienceCity: Record<string, number>;
  audienceCountry: Record<string, number>;
}> {
  const profile = await graphGet<{ followers_count?: number }>(
    `/${params.igUserId}`,
    {
      fields: "followers_count",
      access_token: params.accessToken,
    }
  );

  const insights = await graphGet<{
    data?: Array<{ name?: string; values?: Array<{ value?: Record<string, number> }> }>;
  }>(`/${params.igUserId}/insights`, {
    metric: "audience_gender_age,audience_city,audience_country",
    period: "lifetime",
    access_token: params.accessToken,
  }).catch(() => ({ data: [] }));

  const pick = (name: string): Record<string, number> => {
    const row = insights.data?.find((item) => item.name === name);
    return (row?.values?.[0]?.value as Record<string, number> | undefined) ?? {};
  };

  return {
    followersCount: profile.followers_count ?? 0,
    audienceGenderAge: pick("audience_gender_age"),
    audienceCity: pick("audience_city"),
    audienceCountry: pick("audience_country"),
  };
}

export async function getFacebookPageInsights(params: {
  pageId: string;
  accessToken: string;
}): Promise<{
  followersCount: number;
  pageFansCountry: Record<string, number>;
}> {
  const profile = await graphGet<{ fan_count?: number }>(`/${params.pageId}`, {
    fields: "fan_count",
    access_token: params.accessToken,
  });

  const insights = await graphGet<{
    data?: Array<{ name?: string; values?: Array<{ value?: Record<string, number> }> }>;
  }>(`/${params.pageId}/insights`, {
    metric: "page_fans_country",
    period: "lifetime",
    access_token: params.accessToken,
  }).catch(() => ({ data: [] }));

  const country =
    (insights.data?.find((item) => item.name === "page_fans_country")?.values?.[0]
      ?.value as Record<string, number> | undefined) ?? {};

  return {
    followersCount: profile.fan_count ?? 0,
    pageFansCountry: country,
  };
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

export async function publishInstagramCarousel(params: {
  igUserId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  if (params.imageUrls.length < 2) {
    throw new MetaGraphError("Instagram carousel requires at least 2 image URLs", 400);
  }
  const childIds: string[] = [];
  for (const imageUrl of params.imageUrls.slice(0, 10)) {
    const child = await graphPostForm<{ id: string }>(`/${params.igUserId}/media`, {
      image_url: imageUrl,
      is_carousel_item: true,
      access_token: params.accessToken,
    });
    childIds.push(child.id);
  }
  const caption = buildCaption(params.caption, params.hashtags);
  const container = await graphPostForm<{ id: string }>(`/${params.igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    access_token: params.accessToken,
  });
  const published = await graphPostForm<{ id: string; post_id?: string }>(
    `/${params.igUserId}/media_publish`,
    {
      creation_id: container.id,
      access_token: params.accessToken,
    }
  );
  return { id: published.post_id ?? published.id };
}

export async function publishInstagramVideo(params: {
  igUserId: string;
  accessToken: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  const caption = buildCaption(params.caption, params.hashtags);
  const container = await graphPostForm<{ id: string }>(`/${params.igUserId}/media`, {
    media_type: "REELS",
    video_url: params.videoUrl,
    caption,
    access_token: params.accessToken,
  });
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

export async function publishFacebookPageCarousel(params: {
  pageId: string;
  accessToken: string;
  imageUrls: string[];
  message: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  if (params.imageUrls.length < 2) {
    throw new MetaGraphError("Facebook carousel requires at least 2 image URLs", 400);
  }
  const attachedMedia: string[] = [];
  for (const imageUrl of params.imageUrls.slice(0, 10)) {
    const photo = await graphPostForm<{ id: string }>(`/${params.pageId}/photos`, {
      url: imageUrl,
      published: false,
      access_token: params.accessToken,
    });
    attachedMedia.push(JSON.stringify({ media_fbid: photo.id }));
  }
  const message = buildCaption(params.message, params.hashtags);
  const payload: Record<string, string | number | boolean | undefined> = {
    message,
    access_token: params.accessToken,
  };
  attachedMedia.forEach((value, index) => {
    payload[`attached_media[${index}]`] = value;
  });
  const out = await graphPostForm<{ id: string }>(`/${params.pageId}/feed`, payload);
  return out;
}

export async function publishFacebookPageVideo(params: {
  pageId: string;
  accessToken: string;
  videoUrl: string;
  message: string;
  hashtags: string[];
}): Promise<{ id: string }> {
  const description = buildCaption(params.message, params.hashtags);
  const out = await graphPostForm<{ id: string }>(`/${params.pageId}/videos`, {
    file_url: params.videoUrl,
    description,
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
