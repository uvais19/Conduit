import { z } from "zod";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import {
  contentPillarSchema,
  contentStrategySchema,
  contentType,
  platformScheduleSchema,
  weeklyThemeSchema,
  type ContentStrategy,
  type PillarRole,
  type Platform,
} from "@/lib/types";

type ContentPillar = ContentStrategy["pillars"][number];

const PILLAR_TITLE_MAX = 72;

/** Gemini / JSON-schema payloads sometimes omit `name` or use alternate keys; empty `name` still passes `z.string()`. */
const RAW_PILLAR_TITLE_KEYS = ["name", "pillarName", "title", "label", "heading"] as const;

function clampPillarTitle(s: string): string {
  const t = s.trim();
  if (t.length <= PILLAR_TITLE_MAX) return t;
  return `${t.slice(0, PILLAR_TITLE_MAX - 1).trimEnd()}…`;
}

function titleFromDescription(description: string, index: number): string {
  const oneLine = description.replace(/\s+/g, " ").trim();
  if (!oneLine) return `Content pillar ${index + 1}`;
  return clampPillarTitle(oneLine);
}

function resolveRawPillarTitle(raw: Record<string, unknown>, index: number, description: string): string {
  for (const key of RAW_PILLAR_TITLE_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return clampPillarTitle(v);
  }
  return titleFromDescription(description, index);
}

const DEFAULT_PLATFORMS: Platform[] = ["instagram", "linkedin", "facebook"];
const REQUIRED_PILLAR_ROLES: PillarRole[] = [
  "awareness-education",
  "trust-proof",
  "differentiation-pov",
  "community-engagement",
  "conversion-offer",
];
const VAGUE_PILLAR_TERMS = [
  "tips",
  "insights",
  "best practices",
  "thoughts",
  "updates",
  "trends",
];

function normalizeBestFitPlatformValue(v: unknown, index: number): Platform {
  if (typeof v === "string") {
    const lower = v.toLowerCase();
    if (lower === "instagram" || lower === "facebook" || lower === "linkedin") {
      return lower;
    }
  }
  return DEFAULT_PLATFORMS[index % DEFAULT_PLATFORMS.length]!;
}

function normalizePillarRoleValue(v: unknown, index: number): PillarRole {
  const fallback = REQUIRED_PILLAR_ROLES[index % REQUIRED_PILLAR_ROLES.length]!;
  if (typeof v !== "string") return fallback;
  const lower = v.trim().toLowerCase();
  if (lower === "awareness-education" || lower === "awareness" || lower === "education") {
    return "awareness-education";
  }
  if (lower === "trust-proof" || lower === "trust" || lower === "proof") {
    return "trust-proof";
  }
  if (
    lower === "differentiation-pov" ||
    lower === "differentiation" ||
    lower === "pov" ||
    lower === "point-of-view"
  ) {
    return "differentiation-pov";
  }
  if (lower === "community-engagement" || lower === "community" || lower === "engagement") {
    return "community-engagement";
  }
  if (lower === "conversion-offer" || lower === "conversion" || lower === "offer") {
    return "conversion-offer";
  }
  return fallback;
}

function normalizeSecondaryPlatformsValue(
  raw: Record<string, unknown>,
  primary: Platform
): Platform[] {
  const keys = [
    "alsoFitsPlatforms",
    "also_fit_platforms",
    "secondaryPlatforms",
    "secondary_platforms",
    "supportingPlatforms",
    "repurposePlatforms",
  ] as const;

  let source: unknown;
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) {
      source = raw[key];
      break;
    }
  }

  if (!Array.isArray(source)) return [];

  const out: Platform[] = [];
  const seen = new Set<Platform>();
  for (const item of source) {
    if (typeof item !== "string") continue;
    const lower = item.toLowerCase();
    if (lower !== "instagram" && lower !== "facebook" && lower !== "linkedin") continue;
    if (lower === primary) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(lower);
    if (out.length >= 2) break;
  }
  return out;
}

function normalizePrimaryObjectiveValue(raw: Record<string, unknown>): string {
  const keys = [
    "primaryObjective",
    "primary_objective",
    "strategicIntent",
    "strategic_intent",
    "objective",
    "intent",
    "goal",
  ] as const;
  for (const key of keys) {
    const val = raw[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function normalizeSingleRawPillar(raw: unknown, index: number): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  const desc = typeof o.description === "string" ? o.description : "";
  o.name = resolveRawPillarTitle(o, index, desc);
  const roleKeys = ["pillarRole", "pillar_role", "role", "contentRole"] as const;
  let roleValue: unknown;
  for (const key of roleKeys) {
    if (o[key] !== undefined && o[key] !== null) {
      roleValue = o[key];
      break;
    }
  }
  o.pillarRole = normalizePillarRoleValue(roleValue, index);

  const fromAliases = normalizePrimaryObjectiveValue(o);
  const existingPo = typeof o.primaryObjective === "string" ? o.primaryObjective.trim() : "";
  o.primaryObjective = existingPo || fromAliases || "Brand alignment";

  const platKeys = ["bestFitPlatform", "best_fit_platform", "platform", "primaryPlatform", "channel"] as const;
  let plat: unknown;
  for (const key of platKeys) {
    if (o[key] !== undefined && o[key] !== null) {
      plat = o[key];
      break;
    }
  }
  const bestFitPlatform = normalizeBestFitPlatformValue(plat, index);
  o.bestFitPlatform = bestFitPlatform;
  o.alsoFitsPlatforms = normalizeSecondaryPlatformsValue(o, bestFitPlatform);

  return o;
}

function normalizePillarRecords(records: unknown[]): unknown[] {
  return records.map((p, i) => normalizeSingleRawPillar(p, i));
}

/**
 * Ensures every pillar has a non-empty display name and unique labels (business rules).
 * Re-aligns weekly theme `pillar` strings when names were blank or renamed.
 * Call after model JSON is parsed into a {@link ContentStrategy}.
 */
export function finalizeStrategyPillarNames(strategy: ContentStrategy): ContentStrategy {
  let pillars: ContentPillar[] = strategy.pillars.map((p, i) => {
    const trimmed = typeof p.name === "string" ? p.name.trim() : "";
    const name = trimmed ? clampPillarTitle(trimmed) : titleFromDescription(p.description, i);
    return { ...p, name };
  });

  const seen = new Set<string>();
  pillars = pillars.map((p) => {
    let candidate = p.name.trim();
    const base = candidate;
    let n = 2;
    while (seen.has(candidate.toLowerCase())) {
      candidate = clampPillarTitle(`${base} (${n})`);
      n++;
    }
    seen.add(candidate.toLowerCase());
    return { ...p, name: candidate };
  });

  pillars = pillars.map((p, i) => ({
    ...p,
    pillarRole: normalizePillarRoleValue(p.pillarRole, i),
    primaryObjective: (p.primaryObjective ?? "").trim() || "Brand alignment",
    bestFitPlatform: normalizeBestFitPlatformValue(p.bestFitPlatform, i),
    alsoFitsPlatforms: normalizeSecondaryPlatformsValue(
      { alsoFitsPlatforms: p.alsoFitsPlatforms },
      normalizeBestFitPlatformValue(p.bestFitPlatform, i)
    ),
  }));

  const names = pillars.map((p) => p.name);
  const nameSet = new Set(names);
  const weeklyThemes = strategy.weeklyThemes.map((w) => {
    const ref = w.pillar.trim();
    if (ref && nameSet.has(ref)) return w;
    const fuzzy = pillars.find((p) => p.name.toLowerCase() === ref.toLowerCase());
    if (fuzzy) return { ...w, pillar: fuzzy.name };
    const idx = Math.min(Math.max(0, w.weekNumber - 1), pillars.length - 1);
    return { ...w, pillar: pillars[idx]!.name };
  });

  return { ...strategy, pillars, weeklyThemes };
}

function normalizeForDedup(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

export const strategyPillarsStepSchema = z.object({
  pillars: z.array(contentPillarSchema).length(5),
});

export const strategyScheduleGoalsStepSchema = z.object({
  schedule: z.array(platformScheduleSchema),
  monthlyGoals: contentStrategySchema.shape.monthlyGoals,
});

export const strategyThemesStepSchema = z.object({
  weeklyThemes: z.array(weeklyThemeSchema).length(4),
});

export type StrategyPillarsStep = z.infer<typeof strategyPillarsStepSchema>;
export type StrategyScheduleGoalsStep = z.infer<typeof strategyScheduleGoalsStepSchema>;
export type StrategyThemesStep = z.infer<typeof strategyThemesStepSchema>;

/** Gemini JSON sometimes uses the step array as the root object; Zod expects `{ pillars }` / `{ weeklyThemes }`. */
export function coerceStrategyPillarsStep(raw: unknown): StrategyPillarsStep {
  if (Array.isArray(raw)) {
    return { pillars: normalizePillarRecords(raw) as StrategyPillarsStep["pillars"] };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.pillars)) {
      return { pillars: normalizePillarRecords(o.pillars) as StrategyPillarsStep["pillars"] };
    }
  }
  return raw as StrategyPillarsStep;
}

export function coerceStrategyThemesStep(raw: unknown): StrategyThemesStep {
  if (Array.isArray(raw)) {
    return { weeklyThemes: raw as StrategyThemesStep["weeklyThemes"] };
  }
  return raw as StrategyThemesStep;
}

export function mergeStrategySteps(
  pillarsPart: StrategyPillarsStep,
  schedulePart: StrategyScheduleGoalsStep,
  themesPart: StrategyThemesStep
): ContentStrategy | null {
  const merged = {
    pillars: pillarsPart.pillars,
    schedule: schedulePart.schedule,
    monthlyGoals: schedulePart.monthlyGoals,
    weeklyThemes: themesPart.weeklyThemes,
  };
  const r = contentStrategySchema.safeParse(merged);
  return r.success ? r.data : null;
}

function allowedMixTypesForPlatform(platform: Platform): Set<string> {
  const out = new Set<string>();
  const formats = PLATFORM_KNOWLEDGE[platform].formats;
  const allowedEnum = new Set<string>(contentType.options);

  for (const raw of formats) {
    const f = raw.toLowerCase();
    if (f === "text" || f === "link") {
      out.add("text-only");
      continue;
    }
    if (f === "article") {
      out.add("text-only");
      out.add("carousel");
      continue;
    }
    if (f === "document") {
      out.add("carousel");
      continue;
    }
    if (allowedEnum.has(f)) {
      out.add(f);
    }
  }
  return out;
}

export function validateStrategyBusinessRules(strategy: ContentStrategy): string[] {
  const issues: string[] = [];

  if (strategy.pillars.length !== 5) {
    issues.push(`Expected exactly 5 pillars, got ${strategy.pillars.length}.`);
  }

  const sum = strategy.pillars.reduce((s, p) => s + p.percentage, 0);
  if (Math.abs(sum - 100) > 0.51) {
    issues.push(`Pillar percentages sum to ${sum}, expected 100.`);
  }

  const names = new Set(strategy.pillars.map((p) => p.name.trim()));
  if (names.size !== strategy.pillars.length) {
    issues.push("Pillar names must be unique (after trim).");
  }

  for (const w of strategy.weeklyThemes) {
    if (!names.has(w.pillar.trim())) {
      issues.push(`Weekly theme week ${w.weekNumber} references unknown pillar "${w.pillar}".`);
    }
  }

  for (const pillar of strategy.pillars) {
    if (pillar.alsoFitsPlatforms.length > 2) {
      issues.push(
        `Pillar "${pillar.name}" has ${pillar.alsoFitsPlatforms.length} secondary platforms; max is 2.`
      );
    }
    const deduped = new Set(pillar.alsoFitsPlatforms);
    if (deduped.size !== pillar.alsoFitsPlatforms.length) {
      issues.push(`Pillar "${pillar.name}" has duplicate secondary platforms.`);
    }
    if (pillar.alsoFitsPlatforms.includes(pillar.bestFitPlatform)) {
      issues.push(
        `Pillar "${pillar.name}" includes primary platform "${pillar.bestFitPlatform}" as secondary.`
      );
    }
  }

  const presentRoles = strategy.pillars.map((p) => p.pillarRole);
  const roleSet = new Set(presentRoles);
  for (const role of REQUIRED_PILLAR_ROLES) {
    if (!roleSet.has(role)) {
      issues.push(`Missing pillar role "${role}".`);
    }
  }
  if (roleSet.size !== strategy.pillars.length) {
    issues.push("Each pillarRole must be unique across the 5 pillars.");
  }

  const normalizedObjectives = strategy.pillars.map((p) => normalizeForDedup(p.primaryObjective));
  const objectiveSet = new Set(normalizedObjectives);
  if (objectiveSet.size !== normalizedObjectives.length) {
    issues.push("Each pillar primaryObjective must be unique.");
  }

  for (const pillar of strategy.pillars) {
    const lowerName = pillar.name.trim().toLowerCase();
    const lowerDesc = pillar.description.trim().toLowerCase();
    if (VAGUE_PILLAR_TERMS.some((term) => lowerName === term || lowerName.startsWith(`${term} `))) {
      issues.push(`Pillar "${pillar.name}" name is too vague; use a distinctive brand-grounded label.`);
    }
    if (VAGUE_PILLAR_TERMS.some((term) => lowerDesc.includes(term))) {
      issues.push(`Pillar "${pillar.name}" description appears generic; anchor it to audience + angle + outcome.`);
    }
    if (pillar.exampleTopics.length < 4 || pillar.exampleTopics.length > 6) {
      issues.push(`Pillar "${pillar.name}" must include 4-6 exampleTopics.`);
    }
    for (const topic of pillar.exampleTopics) {
      if (topic.trim().length < 14) {
        issues.push(`Pillar "${pillar.name}" has an example topic that is too short/generic: "${topic}".`);
      }
    }
  }

  if (strategy.weeklyThemes.length !== 4) {
    issues.push(`Expected 4 weekly themes, got ${strategy.weeklyThemes.length}.`);
  }

  for (const row of strategy.schedule) {
    const norms = PLATFORM_KNOWLEDGE[row.platform].postingNorms;
    if (row.postsPerWeek < norms.min || row.postsPerWeek > norms.max) {
      issues.push(
        `${row.platform}: postsPerWeek ${row.postsPerWeek} outside norms ${norms.min}-${norms.max}.`
      );
    }
    const allowed = allowedMixTypesForPlatform(row.platform);
    for (const m of row.contentMix) {
      if (!allowed.has(m.type)) {
        issues.push(
          `${row.platform}: contentMix type "${m.type}" is not allowed (allowed: ${[...allowed].sort().join(", ")}).`
        );
      }
    }
  }

  return issues;
}

export function buildStrategyRepairUserPrompt(params: {
  issues: string[];
  strategy: ContentStrategy;
}): string {
  const capped = JSON.stringify(params.strategy, null, 2).slice(0, 24_000);
  return [
    "## Validation issues (fix all of these)",
    ...params.issues.map((i) => `- ${i}`),
    "",
    "## Repair guidance",
    "- Keep exactly 5 pillars with unique names and unique primaryObjective values.",
    "- Use each pillarRole exactly once: awareness-education, trust-proof, differentiation-pov, community-engagement, conversion-offer.",
    "- For generic pillars, rewrite names/descriptions to be specific to audience, angle, and intended outcome.",
    "- Each pillar must have 4-6 concrete exampleTopics; replace vague or short topic labels.",
    "",
    "## Current strategy JSON (improve in place; keep brand-aligned content)",
    capped,
    "",
    "Return only one JSON object with keys: pillars, schedule, weeklyThemes, monthlyGoals.",
  ].join("\n");
}

export function geminiSchemaForPillarsStep(): unknown | undefined {
  try {
    return z.toJSONSchema(strategyPillarsStepSchema, { target: "draft-2020-12" });
  } catch {
    return undefined;
  }
}

export function geminiSchemaForScheduleGoalsStep(): unknown | undefined {
  try {
    return z.toJSONSchema(strategyScheduleGoalsStepSchema, { target: "draft-2020-12" });
  } catch {
    return undefined;
  }
}

export function geminiSchemaForThemesStep(): unknown | undefined {
  try {
    return z.toJSONSchema(strategyThemesStepSchema, { target: "draft-2020-12" });
  } catch {
    return undefined;
  }
}
