import type { Platform } from "@/lib/types";

export type PlatformPublishFormat =
  | "text-only"
  | "single-image"
  | "multi-image"
  | "video";

export type PlatformCapability = {
  supportsImport: boolean;
  supportsMetrics: boolean;
  supportedPublishFormats: PlatformPublishFormat[];
};

export const PLATFORM_CAPABILITIES: Record<Platform, PlatformCapability> = {
  instagram: {
    supportsImport: true,
    supportsMetrics: true,
    supportedPublishFormats: ["single-image", "multi-image", "video"],
  },
  facebook: {
    supportsImport: true,
    supportsMetrics: true,
    supportedPublishFormats: ["text-only", "single-image", "multi-image", "video"],
  },
  linkedin: {
    supportsImport: true,
    supportsMetrics: true,
    supportedPublishFormats: ["text-only", "single-image", "multi-image", "video"],
  },
};

export function supportsPublishFormat(
  platform: Platform,
  format: PlatformPublishFormat
): boolean {
  return PLATFORM_CAPABILITIES[platform].supportedPublishFormats.includes(format);
}

export function inferDraftPublishFormat(params: {
  mediaUrls: string[];
  mediaType: string;
}): PlatformPublishFormat {
  const mediaCount = params.mediaUrls.filter((url) => url.trim().length > 0).length;
  const mediaType = params.mediaType.toLowerCase();
  if (mediaType.includes("video") || mediaType.includes("reel")) return "video";
  if (mediaCount > 1) return "multi-image";
  if (mediaCount === 1) return "single-image";
  return "text-only";
}
