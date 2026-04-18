import type { BrandManifesto, Platform } from "@/lib/types";

type CtaPattern =
  | "ultra-short"
  | "professional-action"
  | "save-or-link"
  | "community-invite"
  | "local-action";

type PlatformToneProfile = {
  preferredVoiceKeywords: string[];
  toneWeights: Partial<Record<"formal" | "playful" | "technical" | "emotional" | "provocative", number>>;
  goalAffinityKeywords: string[];
  ctaPattern: CtaPattern;
  goalFallback: string;
};

const PLATFORM_TONE_PROFILE: Record<Platform, PlatformToneProfile> = {
  linkedin: {
    preferredVoiceKeywords: [
      "professional", "insightful", "authoritative", "credible",
      "direct", "thoughtful", "expert", "strategic",
    ],
    toneWeights: { formal: 1.5, technical: 1.2, emotional: 0.6, playful: 0.4, provocative: 0.8 },
    goalAffinityKeywords: [
      "lead", "awareness", "authority", "thought leadership",
      "professional", "b2b", "drive", "network",
    ],
    ctaPattern: "professional-action",
    goalFallback: "Drive professional awareness and inbound leads",
  },
  instagram: {
    preferredVoiceKeywords: [
      "inspiring", "visual", "emotional", "relatable", "authentic",
      "warm", "empathetic", "aspirational", "creative",
    ],
    toneWeights: { emotional: 1.5, playful: 1.3, formal: 0.4, provocative: 0.7, technical: 0.5 },
    goalAffinityKeywords: [
      "awareness", "community", "inspire", "brand", "lifestyle",
      "engagement", "visual", "story", "grow",
    ],
    ctaPattern: "save-or-link",
    goalFallback: "Build brand community and inspire followers",
  },
  facebook: {
    preferredVoiceKeywords: [
      "conversational", "warm", "friendly", "community", "relatable",
      "helpful", "approachable", "inclusive", "local",
    ],
    toneWeights: { playful: 1.3, emotional: 1.2, formal: 0.6, provocative: 0.7, technical: 0.7 },
    goalAffinityKeywords: [
      "community", "engagement", "conversation", "shares", "local",
      "events", "retention", "loyalty",
    ],
    ctaPattern: "community-invite",
    goalFallback: "Foster community engagement and shares",
  },
};

const TONE_AXIS_DESCRIPTORS: Record<
  "formal" | "playful" | "technical" | "emotional" | "provocative",
  string
> = {
  formal: "formal",
  playful: "playful",
  technical: "technical",
  emotional: "empathetic",
  provocative: "bold",
};

function scoreByKeywords(value: string, keywords: string[]): number {
  const lower = value.toLowerCase();
  return keywords.reduce((score, keyword) => {
    return score + (lower.includes(keyword) || keyword.includes(lower) ? 1 : 0);
  }, 0);
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractAnchor(source: string, wordCount: number): string {
  return titleCase(source.split(/\s+/).slice(0, wordCount).join(" "));
}

function deriveVoice(manifesto: BrandManifesto, platform: Platform): string {
  const profile = PLATFORM_TONE_PROFILE[platform];

  if (manifesto.voiceAttributes.length === 0) {
    return "clear, practical, and confident";
  }

  const scored = manifesto.voiceAttributes.map((attr) => ({
    attr,
    score: scoreByKeywords(attr, profile.preferredVoiceKeywords),
  }));

  const allZero = scored.every((s) => s.score === 0);
  const sorted = allZero
    ? scored
    : [...scored].sort((a, b) => b.score - a.score);

  const selected = sorted.slice(0, 4).map((s) => s.attr);

  // Append tone descriptors for dominant axes
  for (const [axis, descriptor] of Object.entries(TONE_AXIS_DESCRIPTORS) as [
    keyof typeof TONE_AXIS_DESCRIPTORS,
    string,
  ][]) {
    const weight = profile.toneWeights[axis] ?? 1;
    const score = manifesto.toneSpectrum[axis];
    if (weight > 1.0 && score > 7) {
      const joined = selected.join(" ").toLowerCase();
      if (!joined.includes(descriptor)) {
        selected.push(descriptor);
      }
    }
  }

  if (
    platform === "instagram" &&
    (manifesto.languageStyle.emojiUsage === "moderate" ||
      manifesto.languageStyle.emojiUsage === "heavy")
  ) {
    if (!selected.includes("emoji-friendly")) {
      selected.push("emoji-friendly");
    }
  }

  return selected.join(", ");
}

function deriveObjective(manifesto: BrandManifesto, platform: Platform): string {
  const profile = PLATFORM_TONE_PROFILE[platform];

  if (manifesto.socialMediaGoals.length === 0) {
    return profile.goalFallback;
  }

  const scored = manifesto.socialMediaGoals.map((goal) => ({
    goal,
    score: scoreByKeywords(goal, profile.goalAffinityKeywords),
  }));

  const best = scored.reduce((top, current) =>
    current.score > top.score ? current : top
  );

  return best.score > 0 ? best.goal : profile.goalFallback;
}

function deriveCta(
  manifesto: BrandManifesto,
  platform: Platform,
  objective: string
): string {
  const profile = PLATFORM_TONE_PROFILE[platform];

  const sourceMaterial =
    manifesto.keyMessages[0] ?? manifesto.uniqueSellingPropositions[0] ?? null;

  switch (profile.ctaPattern) {
    case "ultra-short": {
      if (!sourceMaterial) return "Read the thread";
      const anchor = extractAnchor(sourceMaterial, 3);
      const cta = `Thread on: ${anchor}`;
      return cta.length > 30 ? cta.slice(0, 30) : cta;
    }

    case "professional-action": {
      if (!sourceMaterial) return "Learn more — link in comments";
      const anchor = extractAnchor(sourceMaterial, 6);
      const objLower = objective.toLowerCase();
      if (objLower.includes("lead") || objLower.includes("drive")) {
        return `Book a call to discuss ${anchor}`;
      }
      return `Read the full guide on ${anchor}`;
    }

    case "save-or-link": {
      if (!sourceMaterial) return "Save this for later — link in bio";
      const anchor = extractAnchor(sourceMaterial, 6);
      return `Save this and explore ${anchor} — link in bio`;
    }

    case "community-invite": {
      if (!sourceMaterial) return "Drop your thoughts in the comments";
      const anchor = extractAnchor(sourceMaterial, 6);
      return `Tell us your thoughts on ${anchor} below`;
    }

    case "local-action": {
      if (!sourceMaterial) return "Call us now to learn more";
      const anchor = extractAnchor(sourceMaterial, 3);
      const objLower = objective.toLowerCase();
      if (objLower.includes("appointment") || objLower.includes("call")) {
        return "Call us today";
      }
      return `Visit us — ${anchor}`;
    }
  }
}

export function deriveFieldsForPlatform(
  manifesto: BrandManifesto,
  platform: Platform
): { voice: string; objective: string; cta: string } {
  const voice = deriveVoice(manifesto, platform);
  const objective = deriveObjective(manifesto, platform);
  const cta = deriveCta(manifesto, platform, objective);
  return { voice, objective, cta };
}
