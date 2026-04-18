import { PLATFORM_HASHTAG_LIMITS } from "@/lib/constants";
import type { Platform } from "@/lib/types";
import { generateJson } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";

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

export async function suggestHashtagsAI({
  platform,
  pillar,
  topic,
  objective,
}: {
  platform: Platform;
  pillar: string;
  topic: string;
  objective: string;
}): Promise<string[]> {
  const pk = PLATFORM_KNOWLEDGE[platform];
  if (pk.hashtagLimits.max === 0) return [];

  const fallback = suggestHashtags({ platform, pillar, topic, objective });

  const result = await generateJson<{ hashtags: string[] }>({
    systemPrompt: `You are a ${platform} hashtag specialist. Generate hashtags that maximize discoverability.`,
    userPrompt: [
      `Generate ${pk.hashtagLimits.min}-${pk.hashtagLimits.max} hashtags for a ${platform} post.`,
      `Topic: ${topic}`,
      `Content pillar: ${pillar}`,
      `Objective: ${objective}`,
      "",
      platform === "instagram" ? "Mix: 40% high-volume (500K+), 40% niche (10K-100K), 20% branded/specific." :
      platform === "linkedin" ? "Use professional, industry-specific hashtags." :
      platform === "facebook" ? "Use 2-5 relevant hashtags; favour community and topic tags." :
      "Use relevant, specific hashtags.",
      "",
      'Return JSON: { "hashtags": ["#tag1", "#tag2", ...] }',
    ].join("\n"),
    temperature: 0.3,
    fallback: { hashtags: fallback },
  });

  return result.hashtags ?? fallback;
}
