import { generateJson } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type {
  FullStrategySuggestResponse,
  SuggestResponse,
} from "@/lib/strategy/suggest-types";
import type { PostAnalysis } from "@/lib/types";

export type { FullStrategySuggestResponse, SuggestResponse, SuggestionItem } from "@/lib/strategy/suggest-types";

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

Best practices vary by platform — LinkedIn favours weekday mornings, Instagram peaks evenings/weekends, Facebook benefits from a steady weekday rhythm.`,

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
      "field": "Exact UI location label the user will recognise, e.g. 'Pillar 2 — Name', 'Instagram — Preferred days', 'Week 3 — Key message'",
      "current": "The ACTUAL current value as a short string (quote the real text, number, or comma-separated list — not a paraphrase like 'generic description')",
      "suggested": "The ACTUAL proposed new value the form will show after apply (same specificity as current)",
      "reasoning": "One short sentence: why this change helps (optional context only — users compare current vs suggested visually)",
      "target": { "section": "${section}", "rowIndex": 0, "property": "name" }
    }
  ],
  "updatedSection": <the improved section data matching the exact schema of the input>,
  "summary": "2-3 sentence overview of the key improvements made"
}

Every suggestion MUST include "target":
- section: always "${section}" (same as the section you are editing)
- rowIndex: 0-based index into the current ${section} array in the JSON (same order as sent)
- property: for pillars use only "name" | "description" | "percentage"; for schedule use only "postsPerWeek" | "preferredDays" | "preferredTimes" | "contentMix"; for weeklyThemes use only "theme" | "pillar" | "keyMessage". For schedule "contentMix", put human-readable current/suggested strings like "carousel 40%, image 30%, reel 30%" while updatedSection uses the real JSON array.`,


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

const FULL_STRATEGY_JSON_SHAPE = `{
  "section": "all",
  "summary": "2-4 sentences across pillars, schedule, and weekly themes",
  "pillars": {
    "suggestions": [ { "field": "…", "current": "…", "suggested": "…", "reasoning": "…", "target": { "section": "pillars", "rowIndex": 0, "property": "name" } } ],
    "updatedSection": <array matching input pillars schema>
  },
  "schedule": {
    "suggestions": [ { "field": "…", "current": "…", "suggested": "…", "reasoning": "…", "target": { "section": "schedule", "rowIndex": 0, "property": "postsPerWeek" } } ],
    "updatedSection": <array matching input schedule schema (each row includes contentMix)>
  },
  "weeklyThemes": {
    "suggestions": [ { "field": "…", "current": "…", "suggested": "…", "reasoning": "…", "target": { "section": "weeklyThemes", "rowIndex": 0, "property": "theme" } } ],
    "updatedSection": <array matching input weeklyThemes schema>
  }
}`;

export async function runFullStrategySuggestAgent(input: {
  currentStrategy: { pillars: unknown[]; schedule: unknown[]; weeklyThemes: unknown[]; monthlyGoals: unknown[] };
  manifesto: Record<string, unknown>;
  savedStrategy?: Record<string, unknown>;
  postAnalyses?: PostAnalysis[];
}): Promise<FullStrategySuggestResponse> {
  const { currentStrategy, manifesto, savedStrategy, postAnalyses } = input;

  const fallback: FullStrategySuggestResponse = {
    section: "all",
    summary: "No suggestions available at this time.",
    pillars: { suggestions: [], updatedSection: currentStrategy.pillars },
    schedule: { suggestions: [], updatedSection: currentStrategy.schedule },
    weeklyThemes: { suggestions: [], updatedSection: currentStrategy.weeklyThemes },
  };

  const analysisContext = postAnalyses?.length
    ? `\n\nHistorical performance data from connected platforms:\n${JSON.stringify(postAnalyses, null, 2)}\nUse these insights: lean into what works, fix gaps, maintain what aligns.`
    : "";

  const savedStrategyContext = savedStrategy
    ? `\n\nPreviously saved strategy (for reference):\n${JSON.stringify(savedStrategy, null, 2)}`
    : "";

  const scheduleContext = `\n\n${buildPlatformScheduleContext()}`;

  const result = await generateJson<FullStrategySuggestResponse>({
    systemPrompt: `You are a senior social media strategist for Conduit. Improve the user's ENTIRE content strategy (pillars, platform schedule, and weekly themes) in one coherent pass so pillars, cadence, and weekly narrative align with each other and the brand.

You MUST return valid JSON with this exact shape:
${FULL_STRATEGY_JSON_SHAPE}

Rules for every suggestion item:
- "field": Exact UI label (e.g. "Pillar 1 — Name", "LinkedIn — Posts per week", "Week 2 — Theme").
- "current" and "suggested": Literal values the user would see in the form (text, numbers, or comma-separated days/times — NOT vague phrases like "more engaging copy").
- "reasoning": One short sentence of why (supplementary; the user mainly compares current vs suggested).
- "target": REQUIRED on every suggestion. Maps this row to the form:
  - "section": must be "pillars", "schedule", or "weeklyThemes" (same subsection this suggestion belongs to).
  - "rowIndex": 0-based index into that section's array in the input JSON (pillars[0] is first pillar row; schedule[0] first platform row; weeklyThemes[0] first week).
  - "property": pillars → "name"|"description"|"percentage"; schedule → "postsPerWeek"|"preferredDays"|"preferredTimes"|"contentMix"; weeklyThemes → "theme"|"pillar"|"keyMessage". For "contentMix", use readable current/suggested (e.g. "carousel 40%, reel 35%, image 25%"); updatedSection must still use the real contentMix JSON arrays.
- Put each suggestion in the matching subsection's "suggestions" array (pillars suggestions in pillars.suggestions, etc.).
- Provide 3-8 suggestions per section where useful; omit low-value nitpicks.
- "updatedSection" for each part must match the input JSON schema exactly and reflect all proposed edits.`,

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

## What each section controls

### pillars
${SECTION_DESCRIPTIONS.pillars}

### schedule
${SECTION_DESCRIPTIONS.schedule}

### weeklyThemes
${SECTION_DESCRIPTIONS.weeklyThemes}

## Current strategy (update all three sections consistently)

${JSON.stringify(currentStrategy, null, 2)}
${savedStrategyContext}
${analysisContext}
${scheduleContext}

## Your task

1. Analyse pillars, schedule, and weekly themes together against the manifesto and best practices.
2. Return improved data in pillars.updatedSection, schedule.updatedSection, and weeklyThemes.updatedSection — same array lengths and field names as input unless you must fix structural issues.
3. Ensure weekly theme "pillar" strings reference actual pillar names from your updated pillars.
4. Every entry in pillars.suggestions, schedule.suggestions, and weeklyThemes.suggestions MUST include a correct "target" (section + rowIndex + property) so the UI can show it beside that field.
5. Keep recommendations pragmatic.

Return JSON only.`,

    temperature: 0.4,
    fallback,
  });

  if (result.section !== "all" || !result.pillars || !result.schedule || !result.weeklyThemes) {
    return fallback;
  }

  return result;
}
