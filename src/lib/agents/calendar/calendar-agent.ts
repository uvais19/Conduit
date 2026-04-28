import {
  generateJsonStructured,
  resolveGeminiModel,
  resolveGeminiThinking,
} from "@/lib/ai/clients";
import { buildManifestoStrategyDigest } from "@/lib/strategy/manifesto-digest";
import {
  calendarMonthPlanSchema,
  type BrandManifesto,
  type CalendarMonthPlan,
  type ContentStrategy,
  type Platform,
} from "@/lib/types";

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type CalendarSlotBlueprint = {
  id: string;
  date: string;
  platform: Platform;
  suggestedContentType: string;
};

function toIsoMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDates(month: string): Date[] {
  const [y, m] = month.split("-").map((part) => Number(part));
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  const end = new Date(Date.UTC(y, m ?? 1, 0));
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function weekKey(date: Date): string {
  const thursday = new Date(date);
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + (4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeDays(days: string[]): number[] {
  const picked: number[] = [];
  for (const day of days) {
    const idx = WEEKDAY_INDEX[day.trim().toLowerCase()];
    if (idx === undefined) continue;
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked;
}

function buildSlotBlueprint(month: string, strategy: ContentStrategy): CalendarSlotBlueprint[] {
  const dates = buildMonthDates(month);
  const slots: CalendarSlotBlueprint[] = [];

  for (const schedule of strategy.schedule) {
    const allowedWeekdays = normalizeDays(schedule.preferredDays);
    const perWeekCount = new Map<string, number>();
    let mixIndex = 0;

    for (const date of dates) {
      if (allowedWeekdays.length > 0 && !allowedWeekdays.includes(date.getUTCDay())) {
        continue;
      }
      const key = weekKey(date);
      const count = perWeekCount.get(key) ?? 0;
      if (count >= schedule.postsPerWeek) continue;
      perWeekCount.set(key, count + 1);

      const type =
        schedule.contentMix[mixIndex % Math.max(1, schedule.contentMix.length)]?.type ??
        "text-only";
      mixIndex += 1;
      slots.push({
        id: `${schedule.platform}-${toIsoDate(date)}-${count + 1}`,
        date: toIsoDate(date),
        platform: schedule.platform,
        suggestedContentType: type,
      });
    }
  }

  return slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.platform.localeCompare(b.platform);
  });
}

function fallbackPlan(
  month: string,
  timezone: string,
  strategy: ContentStrategy
): CalendarMonthPlan {
  const slots = buildSlotBlueprint(month, strategy);
  const themes = strategy.weeklyThemes.length > 0
    ? strategy.weeklyThemes
    : [
        {
          weekNumber: 1,
          theme: "Core strategy",
          pillar: strategy.pillars[0]?.name ?? "General",
          keyMessage: "Stay consistent with the strategy.",
        },
      ];
  const items = slots.map((slot, index) => {
    const theme = themes[index % themes.length]!;
    return {
      id: slot.id,
      date: slot.date,
      platform: slot.platform,
      pillar: theme.pillar,
      idea: `${theme.theme}: ${theme.keyMessage}`.slice(0, 220),
      contentType: slot.suggestedContentType as
        | "image"
        | "carousel"
        | "video"
        | "story"
        | "text-only"
        | "thread"
        | "poll"
        | "reel",
      keyMessage: theme.keyMessage,
      notes: theme.executionNotes,
    };
  });
  return { month, timezone, items };
}

export async function runCalendarAgent({
  strategy,
  manifesto,
  month,
  timezone,
}: {
  strategy: ContentStrategy;
  manifesto: BrandManifesto;
  month?: string;
  timezone?: string;
}): Promise<CalendarMonthPlan> {
  const targetMonth = month ?? toIsoMonth(new Date());
  const tz = timezone ?? "UTC";
  const fallback = fallbackPlan(targetMonth, tz, strategy);
  const slots = buildSlotBlueprint(targetMonth, strategy);
  const model = resolveGeminiModel("calendar");
  const thinking = resolveGeminiThinking("calendar", model);
  const digest = buildManifestoStrategyDigest(manifesto);

  const raw = await generateJsonStructured<CalendarMonthPlan>({
    systemPrompt: `You are Conduit's senior content planning strategist.
Return only JSON.
Generate a first-month content calendar plan only.
Do not write captions, hooks, hashtags, scripts, or media prompts.
Do not create media assets.
Do not call or assume draft-generation agents.
Each item idea must be a concise post concept (not full copy).`,
    userPrompt: [
      "## Task",
      `Generate the monthly calendar plan for ${targetMonth} in timezone ${tz}.`,
      "Use the exact slot ids and dates provided. Keep one item per slot.",
      "",
      "## Required fields per item",
      "- id (exact slot id provided)",
      "- date (exact date provided)",
      "- platform",
      "- pillar (must match an existing strategy pillar name)",
      "- idea (8-24 words; concept only, no full draft text)",
      "- contentType",
      "- keyMessage (optional)",
      "- notes (optional)",
      "",
      "## Constraints",
      "- Do not generate media directions or production instructions.",
      "- Do not produce complete post copy or detailed draft body.",
      "- Keep ideas distinct across the month.",
      "- Respect platform fit and weekly strategic themes.",
      "",
      "## Brand digest",
      digest,
      "",
      "## Strategy (JSON)",
      JSON.stringify(strategy, null, 2),
      "",
      "## Slot blueprint (JSON)",
      JSON.stringify(slots, null, 2),
    ].join("\n"),
    temperature: 0.35,
    geminiModel: model,
    geminiThinking: thinking,
    fallback,
    responseSchema: {
      type: "object",
      properties: {
        month: { type: "string" },
        timezone: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              date: { type: "string" },
              platform: { type: "string" },
              pillar: { type: "string" },
              idea: { type: "string" },
              contentType: { type: "string" },
              keyMessage: { type: "string" },
              notes: { type: "string" },
            },
            required: ["id", "date", "platform", "pillar", "idea"],
          },
        },
      },
      required: ["month", "timezone", "items"],
    },
  });

  const parsed = calendarMonthPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return fallback;
  }

  const normalizedItems = parsed.data.items.filter((item) =>
    slots.some((slot) => slot.id === item.id && slot.date === item.date)
  );

  if (normalizedItems.length !== slots.length) {
    return fallback;
  }

  return {
    ...parsed.data,
    month: targetMonth,
    timezone: tz,
    items: normalizedItems,
  };
}
