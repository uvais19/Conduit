import { generateJsonStructured } from "@/lib/ai/clients";
import { getMultiPlatformPromptContext } from "@/lib/agents/platform-knowledge";
import { createDefaultStrategy } from "@/lib/strategy/defaults";
import { buildManifestoStrategyDigest } from "@/lib/strategy/manifesto-digest";
import { buildPostAnalysisDigest } from "@/lib/strategy/post-analysis-digest";
import {
  buildStrategyRepairUserPrompt,
  coerceStrategyPillarsStep,
  coerceStrategyThemesStep,
  finalizeStrategyPillarNames,
  geminiSchemaForPillarsStep,
  geminiSchemaForScheduleGoalsStep,
  geminiSchemaForThemesStep,
  mergeStrategySteps,
  strategyPillarsStepSchema,
  strategyScheduleGoalsStepSchema,
  strategyThemesStepSchema,
  validateStrategyBusinessRules,
  type StrategyPillarsStep,
  type StrategyScheduleGoalsStep,
  type StrategyThemesStep,
} from "@/lib/strategy/strategy-generation-steps";
import {
  contentStrategySchema,
  type BrandManifesto,
  type ContentStrategy,
  type Platform,
  type PostAnalysis,
} from "@/lib/types";

const STRATEGY_SYSTEM_PREAMBLE = `You are Conduit's senior social media strategist for SMB marketing leads.
Return only JSON for the requested shape (no markdown, no commentary).
Ground every pillar in the brand digest: tie to audience pains, goals, key messages, voice, or offers.
Each pillar must express a clear strategic objective (why it exists in the mix) and a realistic best-fit primary platform.
You may add up to two secondary platforms per pillar in alsoFitsPlatforms only when cross-platform repurposing is truly natural.
Avoid vague pillar names (e.g. a lone "Tips") unless clearly anchored to the industry and brand.`;

function strategyGeminiModel(): string {
  return process.env.GEMINI_STRATEGY_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

function manifestoAppendix(manifesto: BrandManifesto): string {
  const raw = JSON.stringify(manifesto, null, 2);
  const max = 8000;
  return raw.length > max ? `${raw.slice(0, max)}\n… (truncated)` : raw;
}

export async function runStrategyAgent(
  manifesto: BrandManifesto,
  postAnalyses?: PostAnalysis[],
  platforms?: Platform[],
  competitorInsights?: string | null
): Promise<ContentStrategy> {
  const fallback = createDefaultStrategy(manifesto);
  const digest = buildManifestoStrategyDigest(manifesto);
  const analysisDigest = buildPostAnalysisDigest(postAnalyses);
  const plats = platforms ?? ["instagram", "facebook", "linkedin"];
  const platformCtx = getMultiPlatformPromptContext(plats);
  const model = strategyGeminiModel();

  const competitorBlock =
    competitorInsights?.trim()
      ? [
          "## Competitor intelligence",
          competitorInsights,
          "Differentiate: avoid saturated angles; lean into gaps the brand can own.",
        ].join("\n\n")
      : "";

  const step1Fallback: StrategyPillarsStep = { pillars: fallback.pillars };
  const rawPillars = coerceStrategyPillarsStep(
    (await generateJsonStructured<StrategyPillarsStep>({
      systemPrompt: STRATEGY_SYSTEM_PREAMBLE,
      userPrompt: [
        "## Goal",
        "Define exactly five distinct content pillars for the next month.",
        "Your output must cover the full monthly funnel with no role duplication.",
        "",
        "## Required role coverage",
        "Create exactly one pillar for each role below. Use these exact pillarRole values:",
        "- awareness-education",
        "- trust-proof",
        "- differentiation-pov",
        "- community-engagement",
        "- conversion-offer",
        "No role may appear more than once.",
        "",
        "## Naming",
        "Do not reuse generic template labels such as: Education, Trust & Proof, Conversion, Culture & People, Community & Engagement.",
        "Invent five new pillar names using this brand’s specific vocabulary and proof points—read ## Voice & guardrails and ## Offer & differentiation in the digest (e.g. instead of a generic “Education,” use a distinctive phrase a customer would recognise as yours).",
        "Avoid vague standalone labels like Tips, Insights, Updates, Trends, or Best Practices unless deeply qualified with brand-specific context.",
        "",
        "## Platform rules (pillar format fit)",
        "Each pillar must pick exactly one bestFitPlatform: instagram, facebook, or linkedin—the channel where that pillar’s story angles and formats naturally work best for this audience (not where you post most often).",
        "Optionally include alsoFitsPlatforms as an array of up to two additional platforms for repurposing. Keep this empty when there is no clear fit.",
        "Use norms below; a pillar skewed to long-form thought leadership usually fits LinkedIn better than Instagram Reels unless the digest clearly says otherwise.",
        platformCtx,
        "",
        "## Example topics (quality bar)",
        "Avoid fluff, vague listicles, and generic social-media filler. Each exampleTopics entry must be actionable, specific enough to brief a creator, technically or emotionally concrete for the audience described under ## Audience in the digest, and aligned to that pillar’s primaryObjective.",
        "Each pillar must include 4-6 exampleTopics and each topic should read like a concrete content brief, not a generic category.",
        "",
        "## Specificity rules",
        "Each pillar description must explicitly include: (1) who this is for, (2) the angle this pillar owns, and (3) the intended audience action or business outcome.",
        "primaryObjective must be unique across all five pillars (no near-duplicates).",
        "",
        "## Self-check (before returning JSON)",
        "- Five pillars; names unique; each has name, pillarRole, description, primaryObjective, bestFitPlatform, alsoFitsPlatforms, exampleTopics, percentage.",
        "- Exactly one pillar per required pillarRole; no duplicates.",
        "- Each pillar must include a primaryObjective: one short phrase naming its job in the funnel (e.g. Lead generation, Brand awareness, Authority building, Community retention, Conversion support)—use wording grounded in the digest, not generic jargon alone.",
        "- primaryObjective values must be distinct across all pillars.",
        "- bestFitPlatform must be exactly one of: instagram, facebook, linkedin and must match format/depth implied by the pillar.",
        "- alsoFitsPlatforms is optional, max 2, unique, and must not include bestFitPlatform.",
        "- Each description includes audience + angle + intended outcome.",
        "- Each pillar has 4-6 concrete exampleTopics; no generic filler terms.",
        "- Percentages are integers or sensible decimals summing to 100.",
        "- Each pillar visibly reflects the digest (audience pains, goals, key messages, voice, or offers).",
        "",
        "## Brand digest (primary)",
        digest,
        "",
        "## Full manifesto JSON (reference; field-level accuracy)",
        manifestoAppendix(manifesto),
        ...(analysisDigest ? ["", "## Performance signals", analysisDigest] : []),
        ...(competitorBlock ? ["", competitorBlock] : []),
      ].join("\n\n"),
      temperature: 0.35,
      geminiModel: model,
      fallback: step1Fallback,
      responseSchema: geminiSchemaForPillarsStep(),
    })) as unknown
  );

  const pillarsParsed = strategyPillarsStepSchema.safeParse(rawPillars);
  const pillarsData = pillarsParsed.success ? pillarsParsed.data : step1Fallback;

  const step2Fallback: StrategyScheduleGoalsStep = {
    schedule: fallback.schedule,
    monthlyGoals: fallback.monthlyGoals,
  };

  const rawSchedule = await generateJsonStructured<StrategyScheduleGoalsStep>({
    systemPrompt: STRATEGY_SYSTEM_PREAMBLE,
    userPrompt: [
      "## Goal",
      "Produce platform schedules (cadence, days, times, content mix) and realistic monthlyGoals for the same channels.",
      "",
      "## Accepted pillars (do not rename)",
      JSON.stringify(pillarsData.pillars, null, 2),
      "",
      "## Platform rules (must obey)",
      platformCtx,
      "",
      "## Self-check",
      "- One schedule row per platform in: instagram, facebook, linkedin (same set as default template unless manifesto implies otherwise).",
      "- postsPerWeek within each platform's posting norms range.",
      "- contentMix types must be allowed for that platform (see Supported formats).",
      "- monthlyGoals: 2–4 entries with sensible numeric targets.",
      ...(analysisDigest ? ["", "## Performance signals", analysisDigest] : []),
      ...(competitorBlock ? ["", competitorBlock] : []),
    ].join("\n\n"),
    temperature: 0.28,
    geminiModel: model,
    fallback: step2Fallback,
    responseSchema: geminiSchemaForScheduleGoalsStep(),
  });

  const scheduleParsed = strategyScheduleGoalsStepSchema.safeParse(rawSchedule);
  const scheduleData = scheduleParsed.success ? scheduleParsed.data : step2Fallback;

  const pillarNames = pillarsData.pillars.map((p) => p.name.trim()).join(", ");
  const step3Fallback: StrategyThemesStep = { weeklyThemes: fallback.weeklyThemes };

  const rawThemes = coerceStrategyThemesStep(
    (await generateJsonStructured<StrategyThemesStep>({
      systemPrompt: STRATEGY_SYSTEM_PREAMBLE,
      userPrompt: [
        "## Goal",
        "Produce exactly four weeklyThemes (weeks 1–4). Each row: weekNumber, theme, pillar, keyMessage, executionNotes.",
        "",
        "## Pillar names (pillar field must be exactly one of these strings)",
        pillarNames,
        "",
        "## Self-check",
        "- weekNumber 1..4 in order; pillar must match a name above exactly.",
        "- executionNotes: 1–3 sentences with platform-specific execution (formats + cadence hints for IG / LinkedIn / Facebook).",
        "- keyMessage ties to manifesto goals or digest where possible.",
        "",
        "## Brand digest",
        digest,
        "",
        "## Platform rules (for executionNotes)",
        platformCtx,
      ].join("\n\n"),
      temperature: 0.35,
      geminiModel: model,
      fallback: step3Fallback,
      responseSchema: geminiSchemaForThemesStep(),
    })) as unknown
  );

  const themesParsed = strategyThemesStepSchema.safeParse(rawThemes);
  const themesData = themesParsed.success ? themesParsed.data : step3Fallback;

  const merged = mergeStrategySteps(pillarsData, scheduleData, themesData);
  if (!merged) {
    console.error("Strategy merge failed schema parse; using template fallback.");
    return fallback;
  }

  const mergedFinal = finalizeStrategyPillarNames(merged);

  let issues = validateStrategyBusinessRules(mergedFinal);
  if (issues.length === 0) {
    try {
      return contentStrategySchema.parse(mergedFinal);
    } catch (error) {
      console.error("Strategy final zod parse failed:", error);
      return fallback;
    }
  }

  const repaired = await generateJsonStructured<ContentStrategy>({
    systemPrompt: `${STRATEGY_SYSTEM_PREAMBLE}

You are fixing an existing strategy. Apply minimal edits so all validation issues are resolved; keep strong, on-brand content.`,
    userPrompt: buildStrategyRepairUserPrompt({ issues, strategy: mergedFinal }),
    temperature: 0.22,
    geminiModel: model,
    fallback: mergedFinal,
  });

  const repairedParsed = contentStrategySchema.safeParse(repaired);
  if (!repairedParsed.success) {
    console.error("Strategy repair returned invalid JSON shape; using template fallback.");
    return fallback;
  }

  const repairedFinal = finalizeStrategyPillarNames(repairedParsed.data);

  issues = validateStrategyBusinessRules(repairedFinal);
  if (issues.length > 0) {
    console.error("Strategy still invalid after repair:", issues);
    return fallback;
  }

  return repairedFinal;
}
