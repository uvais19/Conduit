import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto } from "@/lib/types";

type RefinementResult = {
  refinedCaption: string;
  refinedHashtags: string[];
  refinedCta: string;
  explanation: string;
};

export async function runRefinementAgent({
  draft,
  instruction,
  manifesto,
}: {
  draft: ContentDraftRecord;
  instruction: string;
  manifesto: BrandManifesto;
}): Promise<RefinementResult> {
  const platformContext = getPlatformPromptContext(draft.platform);
  const pk = PLATFORM_KNOWLEDGE[draft.platform];

  const result = await generateJson<RefinementResult>({
    systemPrompt: [
      `You are a content editor for ${draft.platform}.`,
      "Apply the user's instruction precisely while maintaining brand voice and platform rules.",
      "",
      platformContext,
    ].join("\n"),
    userPrompt: [
      "## Current draft:",
      `Caption: ${draft.caption}`,
      `Hashtags: ${draft.hashtags.join(", ")}`,
      `CTA: ${draft.cta}`,
      `Platform: ${draft.platform}`,
      `Pillar: ${draft.pillar}`,
      "",
      "## User instruction:",
      instruction,
      "",
      "## Brand voice:",
      JSON.stringify({
        voiceAttributes: manifesto.voiceAttributes,
        toneSpectrum: manifesto.toneSpectrum,
      }),
      "",
      "## Constraints:",
      `- Stay within ${pk.charLimit} characters`,
      `- Hashtags: ${pk.hashtagLimits.min}-${pk.hashtagLimits.max}`,
      "- Maintain brand voice alignment",
      "",
      "Apply the instruction. Explain what you changed and why.",
      'Return JSON: { "refinedCaption": "...", "refinedHashtags": [...], "refinedCta": "...", "explanation": "..." }',
    ].join("\n"),
    temperature: 0.3,
    fallback: {
      refinedCaption: draft.caption,
      refinedHashtags: draft.hashtags,
      refinedCta: draft.cta,
      explanation: "Unable to process refinement.",
    },
  });

  return result;
}
