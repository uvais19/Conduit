import type { ContentDraftRecord } from "@/lib/content/types";
import { platformRequest } from "@/lib/platforms/http";

const GBP_API_BASE =
  process.env.GBP_API_BASE_URL ?? "https://mybusinessbusinessinformation.googleapis.com/v1";
const GBP_POSTS_BASE =
  process.env.GBP_POSTS_BASE_URL ?? "https://mybusiness.googleapis.com/v4";

export async function fetchGbpAccount(accessToken: string): Promise<{
  accountName: string;
  displayName: string;
}> {
  const accounts = await platformRequest<{ accounts?: { name?: string; accountName?: string }[] }>({
    platform: "gbp",
    url: `${GBP_POSTS_BASE}/accounts`,
    token: accessToken,
  });
  const first = accounts.accounts?.[0];
  const accountName = first?.name ?? "";
  if (!accountName) throw new Error("GBP response did not include an account");
  return { accountName, displayName: first?.accountName ?? "Google Business Profile" };
}

export async function fetchGbpFirstLocation(accessToken: string, accountName: string): Promise<{
  locationName: string;
  title: string;
}> {
  const locations = await platformRequest<{ locations?: { name?: string; title?: string }[] }>({
    platform: "gbp",
    url: `${GBP_API_BASE}/${accountName}/locations`,
    token: accessToken,
  });
  const first = locations.locations?.[0];
  const locationName = first?.name ?? "";
  if (!locationName) throw new Error("GBP response did not include a location");
  return { locationName, title: first?.title ?? "GBP Location" };
}

export async function publishGbpPost(params: {
  accessToken: string;
  locationName: string;
  draft: ContentDraftRecord;
}): Promise<{ id: string }> {
  const response = await platformRequest<{ name?: string }>({
    platform: "gbp",
    url: `${GBP_POSTS_BASE}/${params.locationName}/localPosts`,
    method: "POST",
    token: params.accessToken,
    body: {
      languageCode: "en-US",
      summary: params.draft.caption.slice(0, 1500),
      topicType: "STANDARD",
    },
  });
  if (!response.name) throw new Error("GBP publish response did not include a resource id");
  return { id: response.name };
}

export async function fetchGbpPostMetrics(params: {
  accessToken: string;
  locationName: string;
  localPostName: string;
}): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}> {
  const metrics = await platformRequest<{
    localPostMetrics?: { searchViews?: number; views?: number; actions?: { actionType?: string; total?: number }[] };
  }>({
    platform: "gbp",
    url: `${GBP_POSTS_BASE}/${params.localPostName}/reportInsights`,
    method: "POST",
    token: params.accessToken,
    body: {
      basicRequest: {
        metricRequests: [{ metric: "ALL" }],
        localPostNames: [params.localPostName],
      },
    },
  });
  const m = metrics.localPostMetrics;
  const clicks =
    m?.actions?.reduce((sum, next) => sum + (next.total ?? 0), 0) ?? 0;
  const impressions = m?.views ?? m?.searchViews ?? 0;
  return {
    impressions,
    reach: impressions,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks,
  };
}
