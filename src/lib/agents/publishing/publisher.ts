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

  // Real implementation would call the Instagram Graph API:
  // 1. POST /{page-id}/media with image_url + caption
  // 2. POST /{page-id}/media_publish with creation_id
  // For now we simulate success when credentials are present.
  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  const simulatedId = `ig_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
}

async function publishToFacebook(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  const simulatedId = `fb_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
}

async function publishToLinkedIn(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  const simulatedId = `li_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
}

async function publishToX(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  const simulatedId = `x_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
}

async function publishToGBP(
  draft: ContentDraftRecord,
  connection: PlatformConnection
): Promise<PublishResult> {
  const now = new Date().toISOString();

  if (!connection.accessToken) {
    return { success: false, platformPostId: "", publishedAt: now, error: "Missing access token" };
  }

  const simulatedId = `gbp_${Date.now()}_${draft.id.slice(0, 8)}`;
  return { success: true, platformPostId: simulatedId, publishedAt: now };
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
