import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto } from "@/lib/types";

type RevisionResult = {
  revisedCaption: string;
  revisedHashtags: string[];
  revisedCta: string;
  changesSummary: string;
  changesApplied: Array<{ what: string; why: string }>;
};

export async function runRevisionAgent({
  draft,
  revisionNotes,
  manifesto,
}: {
  draft: ContentDraftRecord;
  revisionNotes: string;
  manifesto: BrandManifesto;
}): Promise<RevisionResult> {
  const platformContext = getPlatformPromptContext(draft.platform);

  const result = await generateJson<RevisionResult>({
    systemPrompt: [
      `You are a content revision specialist for ${draft.platform}.`,
      "Apply the reviewer's feedback to improve the content while maintaining brand voice and platform rules.",
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
      "## Reviewer's feedback:",
      revisionNotes,
      "",
      "## Brand voice reference:",
      JSON.stringify({
        voiceAttributes: manifesto.voiceAttributes,
        toneSpectrum: manifesto.toneSpectrum,
        contentDos: manifesto.contentDos,
        contentDonts: manifesto.contentDonts,
      }),
      "",
      "Apply the feedback precisely. Explain each change.",
      'Return JSON: { "revisedCaption": "...", "revisedHashtags": [...], "revisedCta": "...", "changesSummary": "...", "changesApplied": [{"what": "...", "why": "..."}] }',
    ].join("\n"),
    temperature: 0.3,
    fallback: {
      revisedCaption: draft.caption,
      revisedHashtags: draft.hashtags,
      revisedCta: draft.cta,
      changesSummary: "Unable to process revision automatically.",
      changesApplied: [],
    },
  });

  return result;
}
