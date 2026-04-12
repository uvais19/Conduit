import { generateJson } from "@/lib/ai/clients";
import type { BrandManifesto } from "@/lib/types";
import { z } from "zod";

const brandCheckResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  toneScore: z.number().min(0).max(100),
  messageAlignmentScore: z.number().min(0).max(100),
  guidelinesScore: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      severity: z.enum(["error", "warning", "info"]),
      category: z.enum([
        "tone",
        "banned_word",
        "missing_disclosure",
        "off_brand",
        "guideline_violation",
        "length",
      ]),
      message: z.string(),
      suggestion: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  summary: z.string(),
});

export type BrandCheckResult = z.infer<typeof brandCheckResultSchema>;

/**
 * Check a draft caption + hashtags + CTA against the Brand Manifesto.
 * Returns a scored analysis with actionable issues.
 */
export async function checkBrandConsistency(input: {
  caption: string;
  hashtags: string[];
  cta: string | null;
  platform: string;
  manifesto: BrandManifesto;
}): Promise<BrandCheckResult> {
  const { caption, hashtags, cta, platform, manifesto } = input;

  const bannedWordsCheck = (manifesto.bannedWords ?? [])
    .filter((w) => caption.toLowerCase().includes(w.toLowerCase()))
    .map((w) => ({
      severity: "error" as const,
      category: "banned_word" as const,
      message: `Contains banned word: "${w}"`,
      suggestion: `Remove or replace "${w}" with an approved alternative`,
    }));

  const disclosureCheck = (manifesto.requiredDisclosures ?? [])
    .filter((d) => !caption.toLowerCase().includes(d.toLowerCase()))
    .map((d) => ({
      severity: "warning" as const,
      category: "missing_disclosure" as const,
      message: `Missing required disclosure: "${d}"`,
      suggestion: `Add "${d}" to the post for compliance`,
    }));

  const prompt = `You are a brand consistency auditor. Evaluate this social media post against the brand guidelines.

BRAND MANIFESTO:
- Business: ${manifesto.businessName}
- Voice attributes: ${manifesto.voiceAttributes.join(", ")}
- Tone spectrum: Formal=${manifesto.toneSpectrum.formal}/10, Playful=${manifesto.toneSpectrum.playful}/10, Technical=${manifesto.toneSpectrum.technical}/10, Emotional=${manifesto.toneSpectrum.emotional}/10
- Content Do's: ${manifesto.contentDos.join("; ")}
- Content Don'ts: ${manifesto.contentDonts.join("; ")}
- Key messages: ${manifesto.keyMessages.join("; ")}
- Social media goals: ${manifesto.socialMediaGoals.join("; ")}

POST TO CHECK (${platform}):
Caption: ${caption}
Hashtags: ${hashtags.join(" ")}
CTA: ${cta ?? "none"}

Evaluate and return JSON with:
- overallScore (0-100): Overall brand consistency
- toneScore (0-100): How well the tone matches brand voice
- messageAlignmentScore (0-100): How well it supports key messages/goals
- guidelinesScore (0-100): Adherence to content do's and don'ts
- issues: Array of {severity, category, message, suggestion}
- strengths: What this post does well for the brand
- summary: One-paragraph overall assessment`;

  const fallback: BrandCheckResult = {
    overallScore: 70,
    toneScore: 70,
    messageAlignmentScore: 70,
    guidelinesScore: 70,
    issues: [...bannedWordsCheck, ...disclosureCheck],
    strengths: ["Content was generated with brand context"],
    summary: "Brand check completed with basic validation.",
  };

  const result = await generateJson({
    userPrompt: prompt,
    fallback,
  });

  // Merge AI issues with deterministic checks
  result.issues = [...bannedWordsCheck, ...disclosureCheck, ...result.issues];

  return result;
}
