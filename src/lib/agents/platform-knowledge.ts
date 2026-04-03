import { PLATFORM_CHAR_LIMITS, PLATFORM_HASHTAG_LIMITS } from "@/lib/constants";
import type { Platform } from "@/lib/types";

export type MediaSpec = {
  dimensions: Array<{ width: number; height: number; label: string; aspectRatio: string }>;
  maxFileSize: string;
  supportedFormats: string[];
  notes: string;
};

export type PlatformKnowledge = {
  formats: string[];
  mediaSpecs: MediaSpec;
  bestPractices: string[];
  toneGuidance: string;
  contentRules: string[];
  metricsWeight: Record<string, string>;
  visualFormats: string[];
  postingNorms: { min: number; max: number; unit: string };
  charLimit: number;
  hashtagLimits: { min: number; max: number };
};

export const PLATFORM_KNOWLEDGE: Record<Platform, PlatformKnowledge> = {
  instagram: {
    formats: ["image", "carousel", "story", "reel", "text"],
    mediaSpecs: {
      dimensions: [
        { width: 1080, height: 1080, label: "Feed Square", aspectRatio: "1:1" },
        { width: 1080, height: 1350, label: "Feed Portrait", aspectRatio: "4:5" },
        { width: 1080, height: 1920, label: "Story/Reel", aspectRatio: "9:16" },
      ],
      maxFileSize: "30MB for images",
      supportedFormats: ["JPG", "PNG", "MP4", "MOV"],
      notes: "Carousel: up to 10 slides, each 1080x1080. Reels: 9:16, up to 90 seconds.",
    },
    bestPractices: [
      "First line is the hook -- it appears above 'more' and determines if people read on",
      "Use line breaks and short paragraphs for readability",
      "Carousel posts get 3x more engagement than single images on average",
      "Reels are prioritized by the algorithm for reach to non-followers",
      "Saves are the strongest engagement signal for the algorithm",
      "Hashtags: mix 10-15 high-volume (500K+) with 10-15 niche (10K-100K) tags",
    ],
    toneGuidance: "Inspiring, visual, emotional, relatable, authentic. Warm and aspirational. Emoji-friendly when brand allows.",
    contentRules: [
      "Max 2200 characters per caption",
      "First line is the hook -- must be scroll-stopping",
      "Use line breaks for readability (no wall of text)",
      "Structure: Hook -> Value -> CTA",
      "20-30 hashtags, placed at end of caption or in first comment",
      "No clickable links in captions (use 'link in bio')",
      "Carousel: max 10 slides per post",
    ],
    metricsWeight: {
      saves: "highest signal -- indicates bookmark-worthy content",
      shares: "second highest -- drives organic reach",
      comments: "important for algorithm, especially long comments",
      likes: "basic engagement, lowest weight",
      reach: "track for growth, but engagement rate matters more",
    },
    visualFormats: ["image", "carousel", "story"],
    postingNorms: { min: 4, max: 7, unit: "posts/week" },
    charLimit: PLATFORM_CHAR_LIMITS.instagram,
    hashtagLimits: PLATFORM_HASHTAG_LIMITS.instagram,
  },

  linkedin: {
    formats: ["image", "carousel", "article", "text", "document"],
    mediaSpecs: {
      dimensions: [
        { width: 1200, height: 627, label: "Landscape", aspectRatio: "1.91:1" },
        { width: 1080, height: 1080, label: "Square", aspectRatio: "1:1" },
        { width: 1920, height: 1080, label: "Video", aspectRatio: "16:9" },
      ],
      maxFileSize: "10MB for images, 5GB for video",
      supportedFormats: ["JPG", "PNG", "GIF", "MP4", "PDF"],
      notes: "Document/carousel posts are PDF uploads. Max 300 pages. Most effective at 8-12 slides.",
    },
    bestPractices: [
      "Native documents (PDF carousels) get highest organic reach",
      "Text-only posts with strong hooks perform well for thought leadership",
      "Avoid outbound links in post body -- put them in comments instead (algorithm penalty for external links)",
      "Posts with questions in the last line get 2x more comments",
      "Dwell time matters -- longer posts that hold attention rank higher",
      "Best times: weekday mornings 8-10 AM in the audience's timezone",
    ],
    toneGuidance: "Professional, insightful, authoritative. Lead with value, not self-promotion. Thought leadership tone.",
    contentRules: [
      "Max 3000 characters per post",
      "First 2 lines are visible before 'see more' -- make them count",
      "Short paragraphs (1-2 sentences), use line breaks",
      "No outbound links in post body (add in comments)",
      "3-5 hashtags at the end of the post",
      "Document carousels: PDF format, 8-12 slides optimal",
      "Articles are separate from posts -- use for long-form only",
    ],
    metricsWeight: {
      comments: "highest signal -- especially thoughtful/long comments",
      shares: "strong indicator of professional value",
      impressions: "track for reach growth",
      reactions: "basic engagement, lower weight than comments",
      "click-through": "important for link-in-comments strategy",
    },
    visualFormats: ["image", "carousel"],
    postingNorms: { min: 3, max: 5, unit: "posts/week" },
    charLimit: PLATFORM_CHAR_LIMITS.linkedin,
    hashtagLimits: PLATFORM_HASHTAG_LIMITS.linkedin,
  },

  facebook: {
    formats: ["image", "carousel", "video", "text", "link"],
    mediaSpecs: {
      dimensions: [
        { width: 1200, height: 630, label: "Landscape", aspectRatio: "1.91:1" },
        { width: 1080, height: 1080, label: "Square", aspectRatio: "1:1" },
        { width: 1080, height: 1920, label: "Story", aspectRatio: "9:16" },
      ],
      maxFileSize: "30MB for images, 10GB for video",
      supportedFormats: ["JPG", "PNG", "GIF", "MP4", "MOV"],
      notes: "Carousel: up to 10 cards. Video: up to 240 minutes. Stories: 24-hour duration.",
    },
    bestPractices: [
      "Shares are the most valuable engagement metric -- shared content reaches 3-5x more people",
      "Questions and polls drive the most comments",
      "Video content (especially live) gets prioritized in the feed",
      "Community-building content outperforms promotional content",
      "Posts with images get 2.3x more engagement than text-only",
      "Shorter posts (under 80 characters) get more engagement",
    ],
    toneGuidance: "Conversational, warm, friendly, community-oriented. Relatable and approachable. Invite discussion.",
    contentRules: [
      "Max 63206 characters but shorter is better (under 250 chars ideal)",
      "Ask questions to drive comments",
      "Community-first framing: 'we' and 'you' over 'I'",
      "2-5 hashtags, placed naturally in text or at end",
      "Links are fine in posts (unlike LinkedIn/Instagram)",
      "Carousel: up to 10 cards per post",
    ],
    metricsWeight: {
      shares: "highest signal -- indicates content worth spreading",
      comments: "strong signal, especially conversation threads",
      reactions: "varied reactions (love, wow) > plain likes",
      reach: "organic reach is declining, so impressions matter",
      "video views": "important for video content strategy",
    },
    visualFormats: ["image", "carousel"],
    postingNorms: { min: 3, max: 5, unit: "posts/week" },
    charLimit: PLATFORM_CHAR_LIMITS.facebook,
    hashtagLimits: PLATFORM_HASHTAG_LIMITS.facebook,
  },

  x: {
    formats: ["text", "thread", "image", "poll", "video"],
    mediaSpecs: {
      dimensions: [
        { width: 1600, height: 900, label: "Landscape", aspectRatio: "16:9" },
        { width: 1080, height: 1080, label: "Square", aspectRatio: "1:1" },
      ],
      maxFileSize: "5MB for images, 15MB for GIF, 512MB for video",
      supportedFormats: ["JPG", "PNG", "GIF", "MP4"],
      notes: "Max 4 images per tweet. Threads: unlimited tweets but 3-7 is optimal. Polls: up to 4 options, 24hr-7day duration.",
    },
    bestPractices: [
      "Quote tweets are a stronger engagement signal than plain retweets",
      "Threads perform well for thought leadership -- each tweet should stand alone",
      "Posting frequency matters more on X than any other platform -- 5-7 tweets/day for growth",
      "1-2 hashtags maximum -- more than that looks spammy",
      "Controversial/contrarian takes get the most engagement but stay on-brand",
      "Reply to your own tweets to boost thread visibility",
    ],
    toneGuidance: "Bold, sharp, provocative, direct, concise. Punchy and opinionated. Witty when appropriate.",
    contentRules: [
      "Max 280 characters per tweet",
      "Threads: 3-7 tweets optimal, each must stand alone",
      "1-2 hashtags maximum (more looks spammy)",
      "No carousel support -- use up to 4 images",
      "Links consume ~23 characters due to t.co wrapping",
      "Polls: use sparingly for audience research",
    ],
    metricsWeight: {
      "quote tweets": "highest signal -- someone took time to add their take",
      retweets: "strong reach amplifier",
      replies: "engagement depth, especially conversations",
      likes: "basic engagement",
      impressions: "track for reach, but engagement rate matters more",
    },
    visualFormats: ["image"],
    postingNorms: { min: 5, max: 7, unit: "posts/week" },
    charLimit: PLATFORM_CHAR_LIMITS.x,
    hashtagLimits: PLATFORM_HASHTAG_LIMITS.x,
  },

  gbp: {
    formats: ["image", "text", "event", "offer"],
    mediaSpecs: {
      dimensions: [
        { width: 1200, height: 900, label: "Recommended", aspectRatio: "4:3" },
        { width: 720, height: 720, label: "Minimum Square", aspectRatio: "1:1" },
      ],
      maxFileSize: "5MB for images",
      supportedFormats: ["JPG", "PNG"],
      notes: "Photos should be well-lit, in-focus, and show the business. No stock photos. Events can include date/time.",
    },
    bestPractices: [
      "Posts with a clear call-to-action (Call, Visit, Book) drive the most conversions",
      "Local relevance is critical -- mention your area, neighborhood, or local events",
      "Fresh content (posted within 7 days) improves local search ranking",
      "Photos of your actual business/products outperform generic images",
      "Event and offer post types get special formatting in Google search results",
      "Keep posts concise -- GBP posts appear in a small card in search",
    ],
    toneGuidance: "Clear, local, trustworthy, direct, professional. Action-oriented and reliable. Concise.",
    contentRules: [
      "Max 1500 characters",
      "No hashtags (they don't work on GBP)",
      "Include a clear action: visit, call, book, learn more",
      "Mention your location/neighborhood for local SEO",
      "No carousel or story support",
      "Events need: title, date, time, description",
      "Offers need: title, start/end date, terms, coupon code (optional)",
    ],
    metricsWeight: {
      "action clicks": "highest signal -- calls, directions, website clicks",
      "photo views": "indicates discovery and interest",
      "search impressions": "how often you appear in local search",
      "direction requests": "direct foot traffic indicator",
    },
    visualFormats: ["image"],
    postingNorms: { min: 1, max: 2, unit: "posts/week" },
    charLimit: PLATFORM_CHAR_LIMITS.gbp,
    hashtagLimits: PLATFORM_HASHTAG_LIMITS.gbp,
  },
};

/**
 * Returns a prompt-ready string summarizing platform knowledge for injection into agent prompts.
 */
export function getPlatformPromptContext(platform: Platform): string {
  const k = PLATFORM_KNOWLEDGE[platform];
  return [
    `Platform: ${platform.toUpperCase()}`,
    `Supported formats: ${k.formats.join(", ")}`,
    `Character limit: ${k.charLimit}`,
    `Hashtag limits: ${k.hashtagLimits.min}-${k.hashtagLimits.max}`,
    `Posting norms: ${k.postingNorms.min}-${k.postingNorms.max} ${k.postingNorms.unit}`,
    `Tone: ${k.toneGuidance}`,
    "",
    "Content rules:",
    ...k.contentRules.map(r => `- ${r}`),
    "",
    "Best practices:",
    ...k.bestPractices.map(r => `- ${r}`),
    "",
    "Media specifications:",
    ...k.mediaSpecs.dimensions.map(d => `- ${d.label}: ${d.width}x${d.height} (${d.aspectRatio})`),
    `- Max file size: ${k.mediaSpecs.maxFileSize}`,
    `- Formats: ${k.mediaSpecs.supportedFormats.join(", ")}`,
    k.mediaSpecs.notes ? `- Notes: ${k.mediaSpecs.notes}` : "",
    "",
    "Metrics priority:",
    ...Object.entries(k.metricsWeight).map(([metric, desc]) => `- ${metric}: ${desc}`),
  ].join("\n");
}

/**
 * Returns a compact prompt context for multiple platforms at once.
 */
export function getMultiPlatformPromptContext(platforms: Platform[]): string {
  return platforms.map(p => getPlatformPromptContext(p)).join("\n\n---\n\n");
}
