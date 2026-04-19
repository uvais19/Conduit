import { describe, expect, it } from "vitest";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import { buildManifestoStrategyDigest } from "@/lib/strategy/manifesto-digest";
import { buildPostAnalysisDigest } from "@/lib/strategy/post-analysis-digest";
import {
  mergeStrategySteps,
  validateStrategyBusinessRules,
} from "@/lib/strategy/strategy-generation-steps";
import type { BrandManifesto, PostAnalysis } from "@/lib/types";

describe("strategy generation pipeline helpers", () => {
  it("mergeStrategySteps produces valid full strategy", () => {
    const base = createDefaultStrategy();
    const merged = mergeStrategySteps(
      { pillars: base.pillars },
      { schedule: base.schedule, monthlyGoals: base.monthlyGoals },
      { weeklyThemes: base.weeklyThemes }
    );
    expect(merged).not.toBeNull();
    expect(merged!.pillars).toHaveLength(5);
    expect(merged!.weeklyThemes).toHaveLength(4);
  });

  it("validateStrategyBusinessRules passes for default strategy", () => {
    const base = createDefaultStrategy();
    expect(validateStrategyBusinessRules(base)).toEqual([]);
  });

  it("validateStrategyBusinessRules flags bad pillar sum", () => {
    const base = createDefaultStrategy();
    const bad = {
      ...base,
      pillars: base.pillars.map((p, i) => (i === 0 ? { ...p, percentage: 10 } : p)),
    };
    const issues = validateStrategyBusinessRules(bad);
    expect(issues.some((x) => x.includes("100"))).toBe(true);
  });

  it("validateStrategyBusinessRules flags unknown weekly pillar", () => {
    const base = createDefaultStrategy();
    const bad = {
      ...base,
      weeklyThemes: base.weeklyThemes.map((w, i) =>
        i === 0 ? { ...w, pillar: "Nonexistent Pillar" } : w
      ),
    };
    const issues = validateStrategyBusinessRules(bad);
    expect(issues.some((x) => x.includes("unknown pillar"))).toBe(true);
  });

  it("buildManifestoStrategyDigest is bounded and includes business name", () => {
    const manifesto = {
      businessName: "Acme Co",
      industry: "Software",
      coreValues: ["Integrity"],
      productsServices: [{ name: "Widget", description: "Does things" }],
      primaryAudience: {
        demographics: "SMB owners",
        psychographics: "Busy",
      },
      voiceAttributes: ["Clear"],
      toneSpectrum: {
        formal: 5,
        playful: 5,
        technical: 5,
        emotional: 5,
        provocative: 5,
      },
      languageStyle: {
        sentenceLength: "medium",
        vocabulary: "professional",
        perspective: "first-person",
        emojiUsage: "minimal",
      },
      contentDos: ["Be helpful"],
      contentDonts: ["No hype"],
      uniqueSellingPropositions: ["Fast"],
      socialMediaGoals: ["Leads"],
      keyMessages: ["We ship"],
    } as BrandManifesto;

    const d = buildManifestoStrategyDigest(manifesto);
    expect(d).toContain("Acme Co");
    expect(d.length).toBeLessThan(20_000);
  });

  it("buildPostAnalysisDigest returns empty without analyses", () => {
    expect(buildPostAnalysisDigest(undefined)).toBe("");
    expect(buildPostAnalysisDigest([])).toBe("");
  });

  it("buildPostAnalysisDigest includes insights", () => {
    const a: PostAnalysis = {
      detectedTone: ["professional"],
      contentMix: [{ type: "image", percentage: 60 }],
      postingFrequency: {
        postsPerWeek: 3,
        mostActiveDay: "Tuesday",
        mostActiveTime: "09:00",
      },
      performanceByType: [],
      performanceByTopic: [],
      bestPostingTimes: [],
      topPosts: [],
      underperformingPosts: [],
      engagementSummary: {
        avgEngagementRate: 0.02,
        totalReach: 1000,
        totalImpressions: 2000,
        bestPostType: "image",
        worstPostType: "text",
      },
      gapsVsManifesto: [],
      gapsVsStrategy: [],
      overallScore: 72,
      keyInsights: ["Post more video"],
      recommendations: ["Try reels"],
      summary: "Solid baseline.",
    };
    const d = buildPostAnalysisDigest([a]);
    expect(d).toContain("Posting:");
    expect(d).toContain("Post more video");
  });
});
