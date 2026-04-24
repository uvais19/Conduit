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
        pillarRole: "awareness-education",
        primaryObjective: "Brand awareness & education",
        bestFitPlatform: "linkedin",
        alsoFitsPlatforms: ["facebook"],
        percentage: 20,
        exampleTopics: [
          `Best practices in ${industry}`,
          "Common mistakes to avoid",
          "How-to tips",
          "Beginner vs advanced playbooks",
        ],
      },
      {
        name: "Trust & Proof",
        description: "Build credibility using proof points, stories, and behind-the-scenes content.",
        pillarRole: "trust-proof",
        primaryObjective: "Authority building & trust",
        bestFitPlatform: "instagram",
        alsoFitsPlatforms: ["facebook"],
        percentage: 20,
        exampleTopics: [
          "Customer wins",
          "Case studies",
          "Testimonials",
          "Before-and-after outcome breakdowns",
        ],
      },
      {
        name: "Conversion",
        description: "Turn attention into action with offer-led and CTA-driven content.",
        pillarRole: "conversion-offer",
        primaryObjective: "Lead generation & conversion",
        bestFitPlatform: "facebook",
        alsoFitsPlatforms: ["instagram"],
        percentage: 20,
        exampleTopics: [
          "Offer highlights",
          "FAQs before buying",
          "Calls to action",
          "Limited-time bundle explainers",
        ],
      },
      {
        name: "Culture & People",
        description: "Humanise the brand with team stories, values in action, and day-in-the-life content.",
        pillarRole: "community-engagement",
        primaryObjective: "Brand awareness & community",
        bestFitPlatform: "instagram",
        alsoFitsPlatforms: [],
        percentage: 20,
        exampleTopics: [
          "Meet the team",
          "How we work",
          "Values in practice",
          "Community shout-outs and replies",
        ],
      },
      {
        name: "Community & Engagement",
        description: "Spark conversation with polls, questions, user spotlights, and timely reactions to trends.",
        pillarRole: "differentiation-pov",
        primaryObjective: "Engagement & retention",
        bestFitPlatform: "facebook",
        alsoFitsPlatforms: ["instagram"],
        percentage: 20,
        exampleTopics: [
          "Ask the audience",
          "Trending topic takes",
          "Customer spotlights",
          "Contrarian perspective on common myths",
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
    ],
    weeklyThemes: [
      {
        weekNumber: 1,
        theme: "Foundations & Awareness",
        pillar: "Education",
        keyMessage: goals[0],
        executionNotes:
          "Lead with carousels or short reels on Instagram; LinkedIn text-first posts mid-morning; Facebook image + short caption.",
      },
      {
        weekNumber: 2,
        theme: "Proof & Trust",
        pillar: "Trust & Proof",
        keyMessage: goals[1] || goals[0],
        executionNotes:
          "Case-study carousels (IG/LinkedIn); testimonial quote cards; avoid hard selling—show outcomes.",
      },
      {
        weekNumber: 3,
        theme: "Offer Clarity",
        pillar: "Conversion",
        keyMessage: goals[2] || goals[0],
        executionNotes:
          "Single clear CTA per platform; link-in-bio or comment links per channel norms; mix one reel with static posts.",
      },
      {
        weekNumber: 4,
        theme: "People & Participation",
        pillar: "Community & Engagement",
        keyMessage: goals[3] || goals[2] || goals[0],
        executionNotes:
          "Polls or question posts; reply to comments in first hour; light trend-jacking only if it fits brand voice.",
      },
    ],
    monthlyGoals: [
      { metric: "engagement_rate", target: 5, platform: "instagram" },
      { metric: "website_clicks", target: 120, platform: "linkedin" },
      { metric: "reach", target: 2500, platform: "facebook" },
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
  /** Weekly theme key message (explicit for UI / deep links). */
  keyMessage: string;
  /** Optional execution notes from the weekly theme. */
  executionNotes?: string;
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
        id: `${schedule.platform}-${scheduleIndex}-${i}`,
        day,
        time,
        platform: schedule.platform,
        pillar: theme.pillar,
        theme: theme.theme,
        keyMessage: theme.keyMessage,
        executionNotes: theme.executionNotes,
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
