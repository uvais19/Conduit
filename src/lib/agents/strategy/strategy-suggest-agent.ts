import { generateJson } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentStrategy, PostAnalysis } from "@/lib/types";

export type SuggestionItem = {
  field: string;
  current: string;
  suggested: string;
  reasoning: string;
};

export type SuggestResponse = {
  section: string;
  suggestions: SuggestionItem[];
  updatedSection: unknown;
  summary: string;
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  pillars: `Content Pillars are the 3-5 core topic categories that all content revolves around. Each pillar has:
- Name: A concise label for the theme (e.g., "Education", "Customer Success")
- Description: What this pillar covers and why it resonates with the target audience
- Percentage: The share of total content output (all pillar percentages should total 100%)
- Example Topics: Specific post ideas that fall under this pillar

Good pillars are distinct, audience-aligned, and cover the full buyer journey (awareness → consideration → conversion).`,

  schedule: `Platform Schedule controls the posting cadence on each social channel. Each platform has:
- Posts per week: Publishing frequency (consider capacity and audience expectations)
- Preferred days: Days when the audience is most active on this platform
- Preferred times: Optimal posting windows (based on audience timezone and platform engagement patterns)
- Content mix: The format breakdown (e.g., 40% carousel, 30% image, 30% reel for Instagram)

Best practices vary by platform — LinkedIn favours weekday mornings, Instagram peaks evenings/weekends, X rewards consistency throughout the day.`,

  weeklyThemes: `Weekly Themes create a 4-week rotating cadence that keeps content cohesive. Each week has:
- Theme: The overarching focus for the week across all platforms
- Pillar: Which content pillar this week maps to
- Key message: The single takeaway that unifies the week's posts

Effective weekly themes follow a narrative arc: educate → build trust → convert → re-engage.`,
};

function buildPlatformScheduleContext(): string {
  const lines: string[] = [
    "Platform-specific posting norms and supported formats (use when suggesting schedule changes):",
  ];
  for (const [platform, pk] of Object.entries(PLATFORM_KNOWLEDGE)) {
    lines.push(
      `- ${platform.toUpperCase()}: ${pk.postingNorms.min}-${pk.postingNorms.max} ${pk.postingNorms.unit}, formats: ${pk.formats.join(", ")}`
    );
  }
  return lines.join("\n");
}

export async function runStrategySuggestAgent(input: {
  section: "pillars" | "schedule" | "weeklyThemes";
  currentStrategy: { pillars: unknown[]; schedule: unknown[]; weeklyThemes: unknown[]; monthlyGoals: unknown[] };
  manifesto: Record<string, unknown>;
  savedStrategy?: Record<string, unknown>;
  postAnalyses?: PostAnalysis[];
}): Promise<SuggestResponse> {
  const { section, currentStrategy, manifesto, savedStrategy, postAnalyses } = input;

  const sectionData = currentStrategy[section as keyof typeof currentStrategy];

  const fallback: SuggestResponse = {
    section,
    suggestions: [],
    updatedSection: sectionData,
    summary: "No suggestions available at this time.",
  };

  const analysisContext = postAnalyses?.length
    ? `\n\nHistorical performance data from connected platforms:\n${JSON.stringify(postAnalyses, null, 2)}\nUse these insights: lean into what works, fix gaps, maintain what aligns.`
    : "";

  const savedStrategyContext = savedStrategy
    ? `\n\nPreviously saved strategy (for reference):\n${JSON.stringify(savedStrategy, null, 2)}`
    : "";

  const scheduleContext = section === "schedule" ? `\n\n${buildPlatformScheduleContext()}` : "";

  const result = await generateJson<SuggestResponse>({
    systemPrompt: `You are a senior social media strategist for Conduit, an AI-powered social media management platform. Your job is to review a specific section of the user's content strategy and suggest concrete, actionable improvements grounded in their brand identity.

You MUST return valid JSON with this exact shape:
{
  "section": "${section}",
  "suggestions": [
    {
      "field": "short label of what changed",
      "current": "brief description of current value",
      "suggested": "brief description of the improvement",
      "reasoning": "1-2 sentence explanation of WHY this change helps"
    }
  ],
  "updatedSection": <the improved section data matching the exact schema of the input>,
  "summary": "2-3 sentence overview of the key improvements made"
}`,

    userPrompt: `## Brand context

Company: ${manifesto.businessName || "Unknown"}
Industry: ${manifesto.industry || "General"}
Sub-industry: ${manifesto.subIndustry || "N/A"}
Mission: ${manifesto.missionStatement || "N/A"}
Core values: ${JSON.stringify(manifesto.coreValues || [])}
Target audience: ${JSON.stringify(manifesto.primaryAudience || {})}
Voice attributes: ${JSON.stringify(manifesto.voiceAttributes || [])}
Social media goals: ${JSON.stringify(manifesto.socialMediaGoals || [])}
Key messages: ${JSON.stringify(manifesto.keyMessages || [])}
USPs: ${JSON.stringify(manifesto.uniqueSellingPropositions || [])}
Products/Services: ${JSON.stringify(manifesto.productsServices || [])}
Content dos: ${JSON.stringify(manifesto.contentDos || [])}
Content don'ts: ${JSON.stringify(manifesto.contentDonts || [])}

## Section being reviewed: ${section}

### What this section controls:
${SECTION_DESCRIPTIONS[section]}

### Current ${section} data:
${JSON.stringify(sectionData, null, 2)}

### Full current strategy (for cross-section awareness):
${JSON.stringify(currentStrategy, null, 2)}
${savedStrategyContext}
${analysisContext}
${scheduleContext}

## Your task

1. Analyse the current ${section} against the brand manifesto, industry best practices, and audience expectations.
2. Suggest 3-6 specific, high-impact improvements. Consider:
   - Brand alignment: Do pillar names/themes reflect the brand voice and values?
   - Audience fit: Are schedules/topics matched to where and when the audience is active?
   - Content balance: Is the mix diverse enough yet focused on goals?
   - Industry benchmarks: Are posting frequencies realistic and competitive for the industry?
   - Goal alignment: Does the strategy actually drive the stated social media goals?
   ${postAnalyses?.length ? "- Performance data: What does historical data tell us to double down on or change?" : ""}
3. Return the improved section data in "updatedSection" matching the EXACT same JSON schema as the input.
4. Keep improvements pragmatic — don't over-complicate or suggest unrealistic output volumes.

Return JSON only.`,

    temperature: 0.4,
    fallback,
  });

  return result;
}
