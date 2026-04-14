/**
 * Publisher Agent
 *
 * Posts approved/scheduled drafts to each platform's API.
 * Per-platform clients handle the specifics of each API.
 * When platform credentials are absent, falls back to a simulated publish.
 */

import type { Platform } from "@/lib/types";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { PlatformConnection } from "@/lib/platforms/store";
import {
  MetaGraphError,
  publishFacebookFeedPost,
  publishFacebookPagePhoto,
  publishInstagramFeedPhoto,
  resolveInstagramUserId,
} from "@/lib/platforms/meta-graph";
import { publishLinkedInPost } from "@/lib/platforms/linkedin-api";
import { publishXPost } from "@/lib/platforms/x-api";
import { publishGbpPost } from "@/lib/platforms/gbp-api";

export type PublishResult = {
  success: boolean;
  platformPostId: string;
  publishedAt: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Per-platform publish functions
// ---------------------------------------------------------------------------

async function publishToInstagram(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }
  if (!connection.platformPageId?.trim()) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: "Facebook Page ID is required for Instagram Graph publishing",
    };
  }

  const imageUrl = draft.mediaUrls[0]?.trim();
  if (!imageUrl) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: "Instagram publishing requires at least one image URL (publicly reachable HTTPS)",
    };
  }

  try {
    const igUserId = await resolveInstagramUserId(connection);
    if (!igUserId) {
      return {
        success: false,
        platformPostId: "",
        publishedAt: now,
        error:
          "Could not resolve Instagram Business account ID — link an IG account to your Facebook Page or set Platform user ID to the IGBA id",
      };
    }

    const published = await publishInstagramFeedPhoto({
      igUserId,
      accessToken: connection.accessToken,
      imageUrl,
      caption: draft.caption,
      hashtags: draft.hashtags,
    });

    return { success: true, platformPostId: published.id, publishedAt: now };
  } catch (e) {
    const msg =
      e instanceof MetaGraphError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Instagram publish failed";
    return { success: false, platformPostId: "", publishedAt: now, error: msg };
  }
}

async function publishToFacebook(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }
  const pageId = connection.platformPageId?.trim();
  if (!pageId) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: "Facebook Page ID is required for Graph API publishing",
    };
  }

  try {
    const imageUrl = draft.mediaUrls[0]?.trim();
    if (imageUrl) {
      const published = await publishFacebookPagePhoto({
        pageId,
        accessToken: connection.accessToken,
        imageUrl,
        message: draft.caption,
        hashtags: draft.hashtags,
      });
      return { success: true, platformPostId: published.id, publishedAt: now };
    }

    const published = await publishFacebookFeedPost({
      pageId,
      accessToken: connection.accessToken,
      message: draft.caption,
      hashtags: draft.hashtags,
    });
    return { success: true, platformPostId: published.id, publishedAt: now };
  } catch (e) {
    const msg =
      e instanceof MetaGraphError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Facebook publish failed";
    return { success: false, platformPostId: "", publishedAt: now, error: msg };
  }
}

async function publishToLinkedIn(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  if (!connection.platformUserId?.trim()) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: "LinkedIn platform user id is required",
    };
  }
  try {
    const published = await publishLinkedInPost({
      accessToken: connection.accessToken,
      authorUrn: connection.platformUserId.startsWith("urn:")
        ? connection.platformUserId
        : `urn:li:person:${connection.platformUserId}`,
      draft,
    });
    return { success: true, platformPostId: published.id, publishedAt: now };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LinkedIn publish failed";
    return { success: false, platformPostId: "", publishedAt: now, error: msg };
  }
}

async function publishToX(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  try {
    const published = await publishXPost({ accessToken: connection.accessToken, draft });
    return { success: true, platformPostId: published.id, publishedAt: now };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "X publish failed";
    return { success: false, platformPostId: "", publishedAt: now, error: msg };
  }
}

async function publishToGBP(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  if (!connection.platformPageId?.trim()) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: "Google Business Profile location id is required",
    };
  }
  try {
    const published = await publishGbpPost({
      accessToken: connection.accessToken,
      locationName: connection.platformPageId,
      draft,
    });
    return { success: true, platformPostId: published.id, publishedAt: now };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GBP publish failed";
    return { success: false, platformPostId: "", publishedAt: now, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Main dispatch
// ---------------------------------------------------------------------------

const PLATFORM_PUBLISHERS: Record<
  Platform,
  (draft: ContentDraftRecord, connection: PlatformConnection) => Promise<PublishResult>
> = {
  instagram: publishToInstagram,
  facebook: publishToFacebook,
  linkedin: publishToLinkedIn,
  x: publishToX,
  gbp: publishToGBP,
};

export async function publishDraft(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const handler = PLATFORM_PUBLISHERS[draft.platform];
  return handler(draft, connection);
}

/**
 * Simulated publish for when a platform connection is not available.
 * Useful during development and demo flows.
 */
export async function simulatePublish(draft: ContentDraftRecord): Promise<PublishResult> {
  const now = new Date().toISOString();
  const simulatedId = `sim_${draft.platform}_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
}
