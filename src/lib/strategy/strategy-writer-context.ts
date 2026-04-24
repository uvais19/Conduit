import type { ContentStrategy, Platform } from "@/lib/types";

const MAX_CHARS = 3800;
const PILLAR_ROLE_LABELS: Record<ContentStrategy["pillars"][number]["pillarRole"], string> = {
  "awareness-education": "Awareness/Education",
  "trust-proof": "Trust/Proof",
  "differentiation-pov": "Differentiation/POV",
  "community-engagement": "Community/Engagement",
  "conversion-offer": "Conversion/Offer",
};

/**
 * Compact context from the tenant's saved {@link ContentStrategy} for copy agents.
 */
export function buildStrategyWriterContext(
  strategy: ContentStrategy,
  platform: Platform
): string {
  const lines: string[] = [
    "SAVED CONTENT STRATEGY (treat as authoritative for pillars, themes, cadence, and goals):",
    "",
    "## Pillars",
  ];

  for (const p of strategy.pillars) {
    const desc =
      p.description.length > 200 ? `${p.description.slice(0, 200)}…` : p.description;
    const secondary = p.alsoFitsPlatforms.length
      ? `; also fits ${p.alsoFitsPlatforms.join(", ")}`
      : "";
    lines.push(
      `- **${p.name}** [${PILLAR_ROLE_LABELS[p.pillarRole]} · best on ${p.bestFitPlatform}${secondary}] (${p.primaryObjective}, ~${p.percentage}%): ${desc}`
    );
    if (p.exampleTopics?.length) {
      lines.push(`  Example topics: ${p.exampleTopics.slice(0, 5).join("; ")}`);
    }
  }

  const sched = strategy.schedule.find((s) => s.platform === platform);
  lines.push("", `## ${platform} publishing rhythm & formats`);
  if (sched) {
    lines.push(`- Target cadence: ~${sched.postsPerWeek} posts/week`);
    lines.push(`- Preferred slots: ${sched.preferredDays.join(", ")} @ ${sched.preferredTimes.join(", ")}`);
    lines.push(
      `- Intended format mix: ${sched.contentMix.map((c) => `${c.type} ${c.percentage}%`).join(" · ")}`
    );
  } else {
    lines.push("- No dedicated row for this platform in strategy.schedule — stay within pillar intent.");
  }

  lines.push("", "## Weekly themes & key messages");
  if (strategy.weeklyThemes.length === 0) {
    lines.push("- (No weekly themes in strategy — infer from pillars.)");
  } else {
    for (const t of strategy.weeklyThemes.slice(0, 14)) {
      const ex =
        t.executionNotes && t.executionNotes.trim().length > 0
          ? ` Execution notes: ${t.executionNotes.length > 140 ? `${t.executionNotes.slice(0, 140)}…` : t.executionNotes}`
          : "";
      lines.push(
        `- Week ${t.weekNumber} — **${t.theme}** (pillar: ${t.pillar}): ${t.keyMessage}.${ex}`
      );
    }
  }

  const goals = strategy.monthlyGoals.filter((g) => g.platform === platform);
  lines.push("", "## Monthly goals (this platform)");
  if (goals.length === 0) {
    lines.push("- None specified for this platform in strategy — prioritize pillar objectives.");
  } else {
    for (const g of goals.slice(0, 8)) {
      lines.push(`- ${g.metric}: **${g.target}**`);
    }
  }

  let out = lines.join("\n");
  if (out.length > MAX_CHARS) {
    out = `${out.slice(0, MAX_CHARS)}\n\n…(strategy context truncated for length)`;
  }
  return out;
}

export function suggestObjectiveFromMonthlyGoals(
  strategy: ContentStrategy,
  platform: Platform
): string | null {
  const goals = strategy.monthlyGoals.filter((g) => g.platform === platform);
  if (goals.length === 0) return null;
  return goals
    .slice(0, 4)
    .map((g) => `${g.metric}: ${g.target}`)
    .join("; ")
    .slice(0, 200);
}
