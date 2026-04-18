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
  publishFacebookPageCarousel,
  publishFacebookPagePhoto,
  publishFacebookPageVideo,
  publishInstagramCarousel,
  publishInstagramFeedPhoto,
  publishInstagramVideo,
  resolveInstagramUserId,
} from "@/lib/platforms/meta-graph";
import { publishLinkedInPost } from "@/lib/platforms/linkedin-api";
import {
  inferDraftPublishFormat,
  supportsPublishFormat,
} from "@/lib/platforms/capabilities";

function validateMediaUrls(
  draft: ContentDraftRecord,
  format: ReturnType<typeof inferDraftPublishFormat>
): string | null {
  const urls = draft.mediaUrls.filter((url) => url.trim().length > 0);
  const invalid = urls.find((url) => !/^https:\/\//i.test(url));
  if (invalid) return `All media URLs must be public HTTPS URLs. Invalid: ${invalid}`;
  if (format === "single-image" && urls.length !== 1) {
    return "Single-image publish requires exactly one media URL.";
  }
  if (format === "multi-image" && urls.length < 2) {
    return "Multi-image publish requires at least two media URLs.";
  }
  if (format === "video" && urls.length < 1) {
    return "Video publish requires at least one media URL.";
  }
  return null;
}

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
  const format = inferDraftPublishFormat({
    mediaUrls: draft.mediaUrls,
    mediaType: draft.mediaType,
  });

  if (!supportsPublishFormat("instagram", format)) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: `Instagram does not currently support "${format}" publishing in this adapter`,
    };
  }
  const mediaValidationError = validateMediaUrls(draft, format);
  if (mediaValidationError) {
    return { success: false, platformPostId: "", publishedAt: now, error: mediaValidationError };
  }

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

  const mediaUrls = draft.mediaUrls.filter((url) => url.trim().length > 0);

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

    const published =
      format === "multi-image"
        ? await publishInstagramCarousel({
            igUserId,
            accessToken: connection.accessToken,
            imageUrls: mediaUrls,
            caption: draft.caption,
            hashtags: draft.hashtags,
          })
        : format === "video"
          ? await publishInstagramVideo({
              igUserId,
              accessToken: connection.accessToken,
              videoUrl: mediaUrls[0],
              caption: draft.caption,
              hashtags: draft.hashtags,
            })
          : await publishInstagramFeedPhoto({
              igUserId,
              accessToken: connection.accessToken,
              imageUrl: mediaUrls[0],
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
  const format = inferDraftPublishFormat({
    mediaUrls: draft.mediaUrls,
    mediaType: draft.mediaType,
  });

  if (!supportsPublishFormat("facebook", format)) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: `Facebook does not currently support "${format}" publishing in this adapter`,
    };
  }
  const mediaValidationError = validateMediaUrls(draft, format);
  if (mediaValidationError) {
    return { success: false, platformPostId: "", publishedAt: now, error: mediaValidationError };
  }

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
    const mediaUrls = draft.mediaUrls.filter((url) => url.trim().length > 0);
    if (format === "multi-image") {
      const published = await publishFacebookPageCarousel({
        pageId,
        accessToken: connection.accessToken,
        imageUrls: mediaUrls,
        message: draft.caption,
        hashtags: draft.hashtags,
      });
      return { success: true, platformPostId: published.id, publishedAt: now };
    }
    if (format === "video") {
      const published = await publishFacebookPageVideo({
        pageId,
        accessToken: connection.accessToken,
        videoUrl: mediaUrls[0],
        message: draft.caption,
        hashtags: draft.hashtags,
      });
      return { success: true, platformPostId: published.id, publishedAt: now };
    }
    if (format === "single-image") {
      const published = await publishFacebookPagePhoto({
        pageId,
        accessToken: connection.accessToken,
        imageUrl: mediaUrls[0],
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
  const format = inferDraftPublishFormat({
    mediaUrls: draft.mediaUrls,
    mediaType: draft.mediaType,
  });

  if (!supportsPublishFormat("linkedin", format)) {
    return {
      success: false,
      platformPostId: "",
      publishedAt: now,
      error: `LinkedIn does not currently support "${format}" publishing in this adapter`,
    };
  }
  const mediaValidationError = validateMediaUrls(draft, format);
  if (mediaValidationError) {
    return { success: false, platformPostId: "", publishedAt: now, error: mediaValidationError };
  }

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
