import { z } from "zod";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import {
  contentPillarSchema,
  contentStrategySchema,
  contentType,
  platformScheduleSchema,
  weeklyThemeSchema,
  type ContentStrategy,
  type Platform,
} from "@/lib/types";

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
    return { pillars: raw as StrategyPillarsStep["pillars"] };
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
