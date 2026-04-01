import { contentStrategySchema, type BrandManifesto, type ContentStrategy, type Platform } from "@/lib/types";

const DEFAULT_DAYS = ["Monday", "Wednesday", "Friday"];
const DEFAULT_TIMES = ["09:00", "13:00", "17:30"];

export function createDefaultStrategy(
  manifesto?: Partial<BrandManifesto> | null
): ContentStrategy {
  const industry = manifesto?.industry || "General Business";
  const goals = manifesto?.socialMediaGoals?.length
    ? manifesto.socialMediaGoals
    : ["Grow awareness", "Increase engagement", "Drive leads"];

  return contentStrategySchema.parse({
    pillars: [
      {
        name: "Education",
        description: `Teach your audience practical insights related to ${industry}.`,
        percentage: 35,
        exampleTopics: [
          `Best practices in ${industry}`,
          "Common mistakes to avoid",
          "How-to tips",
        ],
      },
      {
        name: "Trust & Proof",
        description: "Build credibility using proof points, stories, and behind-the-scenes content.",
        percentage: 35,
        exampleTopics: [
          "Customer wins",
          "Case studies",
          "Testimonials",
        ],
      },
      {
        name: "Conversion",
        description: "Turn attention into action with offer-led and CTA-driven content.",
        percentage: 30,
        exampleTopics: [
          "Offer highlights",
          "FAQs before buying",
          "Calls to action",
        ],
      },
    ],
    schedule: [
      {
        platform: "linkedin",
        postsPerWeek: 3,
        preferredDays: ["Tuesday", "Thursday", "Friday"],
        preferredTimes: ["08:30", "12:30", "16:30"],
        contentMix: [
          { type: "text-only", percentage: 40 },
          { type: "carousel", percentage: 35 },
          { type: "image", percentage: 25 },
        ],
      },
      {
        platform: "instagram",
        postsPerWeek: 4,
        preferredDays: ["Monday", "Wednesday", "Friday", "Sunday"],
        preferredTimes: ["09:00", "18:00"],
        contentMix: [
          { type: "carousel", percentage: 40 },
          { type: "image", percentage: 30 },
          { type: "reel", percentage: 30 },
        ],
      },
      {
        platform: "facebook",
        postsPerWeek: 3,
        preferredDays: DEFAULT_DAYS,
        preferredTimes: ["10:00", "14:00"],
        contentMix: [
          { type: "image", percentage: 40 },
          { type: "text-only", percentage: 30 },
          { type: "video", percentage: 30 },
        ],
      },
      {
        platform: "x",
        postsPerWeek: 5,
        preferredDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        preferredTimes: ["08:00", "12:00", "17:00"],
        contentMix: [
          { type: "text-only", percentage: 45 },
          { type: "thread", percentage: 35 },
          { type: "poll", percentage: 20 },
        ],
      },
      {
        platform: "gbp",
        postsPerWeek: 2,
        preferredDays: ["Tuesday", "Friday"],
        preferredTimes: ["11:00"],
        contentMix: [
          { type: "image", percentage: 50 },
          { type: "text-only", percentage: 50 },
        ],
      },
    ],
    weeklyThemes: [
      {
        weekNumber: 1,
        theme: "Foundations & Awareness",
        pillar: "Education",
        keyMessage: goals[0],
      },
      {
        weekNumber: 2,
        theme: "Proof & Trust",
        pillar: "Trust & Proof",
        keyMessage: goals[1] || goals[0],
      },
      {
        weekNumber: 3,
        theme: "Offer Clarity",
        pillar: "Conversion",
        keyMessage: goals[2] || goals[0],
      },
      {
        weekNumber: 4,
        theme: "Community Momentum",
        pillar: "Education",
        keyMessage: "Stay top of mind with useful, consistent content.",
      },
    ],
    monthlyGoals: [
      { metric: "engagement_rate", target: 5, platform: "instagram" },
      { metric: "website_clicks", target: 120, platform: "linkedin" },
      { metric: "reach", target: 2500, platform: "facebook" },
      { metric: "followers", target: 75, platform: "x" },
      { metric: "actions", target: 25, platform: "gbp" },
    ],
  });
}

export type CalendarPreviewItem = {
  id: string;
  day: string;
  time: string;
  platform: Platform;
  pillar: string;
  theme: string;
  contentType: string;
  summary: string;
};

export function buildCalendarPreview(strategy: ContentStrategy): CalendarPreviewItem[] {
  const items: CalendarPreviewItem[] = [];
  const themes = strategy.weeklyThemes.length > 0
    ? strategy.weeklyThemes
    : [{ weekNumber: 1, theme: "Core Brand Themes", pillar: strategy.pillars[0]?.name || "Education", keyMessage: "Stay consistent." }];

  strategy.schedule.forEach((schedule, scheduleIndex) => {
    for (let i = 0; i < schedule.postsPerWeek; i += 1) {
      const day = schedule.preferredDays[i % schedule.preferredDays.length] || DEFAULT_DAYS[i % DEFAULT_DAYS.length];
      const time = schedule.preferredTimes[i % schedule.preferredTimes.length] || DEFAULT_TIMES[i % DEFAULT_TIMES.length];
      const theme = themes[(scheduleIndex + i) % themes.length];
      const contentType = schedule.contentMix[i % schedule.contentMix.length]?.type || "text-only";

      items.push({
        id: `${schedule.platform}-${i}`,
        day,
        time,
        platform: schedule.platform,
        pillar: theme.pillar,
        theme: theme.theme,
        contentType,
        summary: `${theme.keyMessage} • ${contentType}`,
      });
    }
  });

  const weekdayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return items.sort((a, b) => {
    const dayDiff = weekdayOrder.indexOf(a.day) - weekdayOrder.indexOf(b.day);
    if (dayDiff !== 0) {
      return dayDiff;
    }
    return a.time.localeCompare(b.time);
  });
}
