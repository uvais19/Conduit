import { PLATFORM_HASHTAG_LIMITS } from "@/lib/constants";
import type { Platform } from "@/lib/types";

function slugifyTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("");
}

export function suggestHashtags({
  platform,
  pillar,
  topic,
  objective,
}: {
  platform: Platform;
  pillar: string;
  topic: string;
  objective: string;
}): string[] {
  const limits = PLATFORM_HASHTAG_LIMITS[platform];
  if (limits.max === 0) {
    return [];
  }

  const base = [
    pillar,
    topic,
    objective,
    "social media",
    "marketing",
    platform,
    "small business",
    "growth",
    "content strategy",
  ];

  const tags = Array.from(
    new Set(
      base
        .map((value) => slugifyTag(value))
        .filter(Boolean)
        .map((value) => `#${value}`)
    )
  );

  while (tags.length < limits.min) {
    tags.push(`#${platform}tips${tags.length}`);
  }

  return tags.slice(0, limits.max);
}
