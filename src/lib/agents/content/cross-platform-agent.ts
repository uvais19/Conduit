import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { BrandManifesto, Platform } from "@/lib/types";

type PlatformAdaptation = {
  caption: string;
  hashtags: string[];
  cta: string;
  mediaType: string;
  recommendedDimensions: { width: number; height: number; aspectRatio: string };
};

type CrossPlatformResult = Record<string, PlatformAdaptation>;

export async function runCrossPlatformAgent({
  caption,
  sourcePlatform,
  targetPlatforms,
  manifesto,
  pillar,
  topic,
}: {
  caption: string;
  sourcePlatform: Platform;
  targetPlatforms: Platform[];
  manifesto: BrandManifesto;
  pillar: string;
  topic: string;
}): Promise<CrossPlatformResult> {
  const platformContexts = targetPlatforms
    .map((p) => `## ${p} guidelines:\n${getPlatformPromptContext(p)}`)
    .join("\n\n");

  const result = await generateJson<CrossPlatformResult>({
    systemPrompt: [
      "You are a cross-platform content adaptation specialist.",
      "Adapt content from one platform to others while preserving the core message.",
      "Each adaptation must feel native to its target platform.",
      "",
      platformContexts,
    ].join("\n"),
    userPrompt: [
      `## Source content (${sourcePlatform}):`,
      `Caption: ${caption}`,
      `Pillar: ${pillar}`,
      `Topic: ${topic}`,
      "",
      "## Brand voice:",
      JSON.stringify({
        voiceAttributes: manifesto.voiceAttributes,
        toneSpectrum: manifesto.toneSpectrum,
      }),
      "",
      `## Target platforms: ${targetPlatforms.join(", ")}`,
      "",
      "For EACH target platform, adapt the content:",
      "- Match the platform's tone and style",
      "- Respect character limits and hashtag rules",
      "- Recommend the best media type and dimensions",
      "- The core message must stay the same",
      "",
      `Return JSON with keys for each target platform: { "${targetPlatforms.join('": {...}, "')}" : {...} }`,
      'Each value: { "caption": "...", "hashtags": [...], "cta": "...", "mediaType": "...", "recommendedDimensions": { "width": N, "height": N, "aspectRatio": "..." } }',
    ].join("\n"),
    temperature: 0.4,
    fallback: Object.fromEntries(
      targetPlatforms.map((p) => {
        const pk = PLATFORM_KNOWLEDGE[p];
        const dim = pk.mediaSpecs.dimensions[0];
        return [
          p,
          {
            caption,
            hashtags: [],
            cta: "",
            mediaType: pk.formats[0] ?? "image",
            recommendedDimensions: dim
              ? { width: dim.width, height: dim.height, aspectRatio: dim.aspectRatio }
              : { width: 1080, height: 1080, aspectRatio: "1:1" },
          },
        ];
      })
    ),
  });

  return result;
}
