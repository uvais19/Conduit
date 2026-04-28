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
import { PLATFORM_LABELS } from "@/lib/constants";

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

type CalendarPromptContext = {
  targetMonth: string;
  timezone: string;
  strategy: ContentStrategy;
  slots: CalendarSlotBlueprint[];
  digest: string;
};

const CALENDAR_HARD_CONSTRAINTS = [
  "Return only valid JSON matching the response schema.",
  "Generate exactly one item per provided slot id and date.",
  "Never invent ids, dates, platforms, pillars, or additional fields.",
  "Do not write captions, hooks, hashtags, scripts, media prompts, or production checklists.",
  "Keep each idea concise (8-24 words), strategic, and draft-free.",
] as const;

const CALENDAR_QUALITY_RUBRIC = [
  "Ideas are specific enough to execute but not full post copy.",
  "Concepts are distinct across the full window (avoid repetition).",
  "Pillar choice aligns with weekly themes and platform behavior.",
  "Content type feels native to each platform and schedule intent.",
] as const;

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addOneMonthClamped(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonth = month + 1;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay)));
}

function buildWindowDates(windowStart: string): Date[] {
  const [y, m, d] = windowStart.split("-").map((part) => Number(part));
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const end = addOneMonthClamped(start);
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

function contentTypeLabel(type?: string): string {
  if (!type) return "post";
  return type.replace(/-/g, " ");
}

function buildExecutionNote({
  platform,
  pillar,
  contentType,
  strategy,
}: {
  platform: Platform;
  pillar: string;
  contentType?: string;
  strategy: ContentStrategy;
}): string {
  const schedule = strategy.schedule.find((entry) => entry.platform === platform);
  const platformLabel = PLATFORM_LABELS[platform] ?? platform;
  const times = (schedule?.preferredTimes ?? []).slice(0, 2).join(" / ");
  const days = (schedule?.preferredDays ?? []).slice(0, 3).join(", ");
  const cadence = schedule?.postsPerWeek ?? 1;
  const format = contentTypeLabel(contentType);
  const parts = [
    `${platformLabel} ${format} aligned to "${pillar}".`,
    days ? `Publish on ${days}.` : "",
    times ? `Target ${times}.` : "",
    `Keep to ${cadence}/week cadence from strategy.`,
  ].filter(Boolean);
  return parts.join(" ");
}

function buildCalendarSystemPrompt(): string {
  return [
    "You are Conduit's principal content strategy planner.",
    "Your job is to transform strategy constraints into a one-month calendar blueprint.",
    "",
    "Hard constraints:",
    ...CALENDAR_HARD_CONSTRAINTS.map((item) => `- ${item}`),
    "",
    "Quality rubric:",
    ...CALENDAR_QUALITY_RUBRIC.map((item) => `- ${item}`),
    "",
    "If constraints conflict, prioritize slot fidelity and schema validity.",
  ].join("\n");
}

function buildCalendarUserPrompt({
  targetMonth,
  timezone,
  strategy,
  slots,
  digest,
}: CalendarPromptContext): string {
  return [
    "## Objective",
    `Generate a rolling one-month calendar window starting ${targetMonth} in timezone ${timezone}.`,
    "The window continues through the same day next month (inclusive, clamped to month-end when needed).",
    "",
    "## Output contract",
    "- Keep month and timezone consistent with the requested values.",
    "- Keep item count exactly equal to slot count.",
    "- For every slot, copy id/date/platform exactly as provided.",
    "- pillar must match one of the strategy pillar names exactly.",
    "- idea must be 8-24 words and must remain concept-level (not draft copy).",
    "- contentType should align with the slot suggestion unless strategy fit strongly requires another listed type.",
    "- keyMessage and notes are optional.",
    "",
    "## Do not do",
    "- Do not generate media directions, production instructions, or execution runbooks.",
    "- Do not output complete post copy, scripts, or long-form drafts.",
    "- Do not add, remove, or reorder schema fields.",
    "",
    "## Brand digest",
    digest,
    "",
    "## Strategy (JSON)",
    JSON.stringify(strategy, null, 2),
    "",
    "## Slot blueprint (JSON)",
    JSON.stringify(slots, null, 2),
    "",
    "## Final self-check before returning JSON",
    "- Is every slot represented exactly once?",
    "- Are all ids/dates/platforms copied verbatim from slots?",
    "- Are ideas concise, non-repetitive, and non-draft?",
  ].join("\n");
}

function buildSlotBlueprint(windowStart: string, strategy: ContentStrategy): CalendarSlotBlueprint[] {
  const dates = buildWindowDates(windowStart);
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
  windowStart: string,
  timezone: string,
  strategy: ContentStrategy
): CalendarMonthPlan {
  const slots = buildSlotBlueprint(windowStart, strategy);
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
      notes: buildExecutionNote({
        platform: slot.platform,
        pillar: theme.pillar,
        contentType: slot.suggestedContentType,
        strategy,
      }),
    };
  });
  return { month: windowStart, timezone, items };
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
  const targetMonth = month ?? toIsoDate(new Date());
  const tz = timezone ?? "UTC";
  const fallback = fallbackPlan(targetMonth, tz, strategy);
  const slots = buildSlotBlueprint(targetMonth, strategy);
  const model = resolveGeminiModel("calendar");
  const thinking = resolveGeminiThinking("calendar", model);
  const digest = buildManifestoStrategyDigest(manifesto);

  const raw = await generateJsonStructured<CalendarMonthPlan>({
    systemPrompt: buildCalendarSystemPrompt(),
    userPrompt: buildCalendarUserPrompt({
      targetMonth,
      timezone: tz,
      strategy,
      slots,
      digest,
    }),
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

  const itemsBySlot = new Map(
    parsed.data.items.map((item) => [`${item.id}::${item.date}`, item])
  );
  if (itemsBySlot.size !== slots.length) {
    return fallback;
  }

  const normalizedItems = slots.map((slot) => {
    const key = `${slot.id}::${slot.date}`;
    return itemsBySlot.get(key) ?? null;
  });

  if (normalizedItems.some((item) => item === null)) {
    return fallback;
  }

  return {
    ...parsed.data,
    month: targetMonth,
    timezone: tz,
    items: normalizedItems.map((item) => {
      const resolved = item!;
      return {
        ...resolved,
        notes: buildExecutionNote({
          platform: resolved.platform,
          pillar: resolved.pillar,
          contentType: resolved.contentType,
          strategy,
        }),
      };
    }),
  };
}
