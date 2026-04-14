# Conduit: Subagent Architecture Fix & AI Improvements - Execution Guide

> This document is a self-contained execution guide for fixing the agent/subagent architecture and implementing AI improvements. Use it to resume work if context is lost.

---

## Table of Contents

1. [Problem Summary](#problem-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase 0: Platform Knowledge Module](#phase-0-platform-knowledge-module)
4. [Phase 1: AI-Powered Content Writer](#phase-1-ai-powered-content-writer)
5. [Phase 2: Platform-Specific Strategy Agent](#phase-2-platform-specific-strategy-agent)
6. [Phase 3: Platform-Specific Post Analyser](#phase-3-platform-specific-post-analyser)
7. [Phase 4: Platform-Aware Visual Designer](#phase-4-platform-aware-visual-designer)
8. [Phase 5: Extract Strategy Suggest into Agent Module](#phase-5-extract-strategy-suggest-into-agent-module)
9. [Phase 6: Enhanced Optimizer Agent](#phase-6-enhanced-optimizer-agent)
10. [Phase 7: AI-Powered Hashtag Generation](#phase-7-ai-powered-hashtag-generation)
11. [Phase 8: Streaming Responses](#phase-8-streaming-responses)
12. [Phase 9: AI-Powered Content Revision](#phase-9-ai-powered-content-revision)
13. [Phase 10: A/B Test Scoring](#phase-10-ab-test-scoring)
14. [Phase 11: Conversational Content Refinement](#phase-11-conversational-content-refinement)
15. [Phase 12: Cross-Platform Caption Rewriter](#phase-12-cross-platform-caption-rewriter)
16. [Phase 13: Competitor Analysis Integration](#phase-13-competitor-analysis-integration)
17. [Implementation Order](#implementation-order)
18. [Verification Checklist](#verification-checklist)

---

## Problem Summary

The app was designed so each platform (Instagram, LinkedIn, Facebook, X, GBP) has dedicated subagents with deep platform-specific intelligence. **In practice, this is NOT implemented correctly:**

| Problem | Location | Severity |
|---------|----------|----------|
| Content writer is NOT AI-powered at all -- uses hardcoded string templates | `src/lib/agents/content/writers.ts` | Critical |
| Strategy suggest logic is inline in the API route (~200 lines of prompt) | `src/app/api/strategy/suggest/route.ts` | High |
| Post analyser uses identical criteria for all platforms | `src/lib/agents/analysis/post-analyser.ts` | High |
| Visual designer generates carousels+stories for platforms that don't support them | `src/lib/agents/content/visual-designer.ts` | High |
| Strategy agent has no platform knowledge | `src/lib/agents/strategy/strategy-agent.ts` | Medium |
| Optimizer agent doesn't use strategy/analysis data | `src/lib/agents/optimization/optimizer-agent.ts` | Medium |
| Hashtag generation is purely deterministic | `src/lib/content/hashtags.ts` | Medium |
| No streaming -- all AI calls block until complete | `src/lib/ai/clients.ts` | Medium |
| No AI-powered revision when approver requests changes | Approval workflow | New feature |
| No A/B variant performance learning | Content pipeline | New feature |
| No conversational content refinement | Draft editor | New feature |
| No cross-platform caption adaptation | Content pipeline | New feature |
| Competitor agent exists but isn't wired to strategy | `src/lib/agents/competitors/` | Medium |

**What works well (don't change):**
- Discovery pipeline uses LangGraph with proper orchestration (`src/lib/agents/discovery/`)
- Centralized AI client with Gemini->Groq fallback (`src/lib/ai/clients.ts`)
- Zod validation on all agent outputs
- Typed returns throughout

---

## Architecture Overview

### Current AI Client Pattern (KEEP THIS)
```
src/lib/ai/clients.ts
  - generateText(options) -> string | null    [Gemini primary, Groq fallback]
  - generateJson<T>(options & { fallback: T }) -> T    [wraps generateText, parses JSON]
```

All agents call `generateJson()` or `generateText()`. This pattern stays.

### Agent File Structure
```
src/lib/agents/
  discovery/          # LangGraph pipeline (GOOD, don't touch)
    graph.ts
    scraper-agent.ts
    document-analyst-agent.ts
    identity-synthesizer-agent.ts
  strategy/
    strategy-agent.ts        # Phase 2: enhance
    strategy-suggest-agent.ts  # Phase 5: NEW (extract from route)
    index.ts
  analysis/
    post-analyser.ts         # Phase 3: enhance
  content/
    writers.ts               # Phase 1: REWRITE (biggest change)
    visual-designer.ts       # Phase 4: enhance
    revision-agent.ts        # Phase 9: NEW
    ab-scoring-agent.ts      # Phase 10: NEW
    refinement-agent.ts      # Phase 11: NEW
    cross-platform-agent.ts  # Phase 12: NEW
  optimization/
    optimizer-agent.ts       # Phase 6: enhance
  competitors/
    competitor-agent.ts      # Phase 13: enhance
  platform-knowledge.ts      # Phase 0: NEW (foundation)
```

### Key Types (from `src/lib/types.ts`)
- `Platform` = `"instagram" | "facebook" | "linkedin" | "x" | "gbp"`
- `BrandManifesto` -- complete brand identity (voice, values, audience, goals)
- `ContentStrategy` -- pillars, schedule, weekly themes, monthly goals
- `PostAnalysis` -- analysis results per platform

### Key Types (from `src/lib/content/types.ts`)
- `ContentGenerationRequest` -- platform, pillar, topic, objective, audience, voice, cta, generateVariants
- `GeneratedVariant` -- variantLabel (A/B/C), caption, hashtags, cta
- `ContentDraftRecord` -- full draft with status lifecycle
- `VisualPlan` -- imagePrompt, carousel slides, storyTemplate

---

## Phase 0: Platform Knowledge Module

### What to create
**New file: `src/lib/agents/platform-knowledge.ts`**

This is the foundation that ALL other phases depend on. Every agent imports from this module.

### Exact implementation

```typescript
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
```

### Key decisions
- Export both the raw `PLATFORM_KNOWLEDGE` object and helper functions (`getPlatformPromptContext`, `getMultiPlatformPromptContext`)
- Include `MediaSpec` type for image dimensions -- used by visual designer (Phase 4) and content writer (Phase 1)
- Import existing constants from `src/lib/constants.ts` to avoid duplication

---

## Phase 1: AI-Powered Content Writer

### File to modify: `src/lib/agents/content/writers.ts`

### Current state (BROKEN)
The current `runPlatformWriterAgent()` is synchronous and builds captions via string concatenation:
```typescript
// CURRENT: No AI at all
function buildCaption(input, variantLabel) {
  const style = styleForPlatform(input.platform); // Returns hardcoded strings
  return `${style.opener}\n${input.topic} (${nuanceByVariant[variantLabel]} angle)...`;
}
```

### Required changes

1. **Delete** `styleForPlatform()`, `buildCaption()`, `truncateForPlatform()` functions -- they are the old template system
2. **Make** `runPlatformWriterAgent()` **async** -- it now calls `generateJson()`
3. **Make** `generatePlatformVariants()` **async** 
4. **No fallback to templates** -- if AI fails, throw an error
5. Import `getPlatformPromptContext` from `platform-knowledge.ts`

### New implementation pattern

```typescript
import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentGenerationRequest, GeneratedVariant, VariantLabel } from "@/lib/content/types";
import { suggestHashtagsAI } from "@/lib/content/hashtags"; // Phase 7

const VARIANT_ANGLES: Record<VariantLabel, string> = {
  A: "educational -- lead with a surprising fact, teach something actionable",
  B: "story-driven -- use a narrative arc, relatable scenario, or case study",
  C: "results-first -- lead with outcomes/numbers, then explain the method",
};

export async function runPlatformWriterAgent(
  input: ContentGenerationRequest,
  variantLabel: VariantLabel
): Promise<GeneratedVariant> {
  const platformContext = getPlatformPromptContext(input.platform);
  const pk = PLATFORM_KNOWLEDGE[input.platform];

  const result = await generateJson<{ caption: string; hashtags: string[]; cta: string }>({
    systemPrompt: [
      `You are a ${input.platform} content writing specialist for Conduit, an AI social media manager.`,
      `Write content that is native to ${input.platform} and follows its specific rules and best practices.`,
      "",
      platformContext,
      "",
      "Return valid JSON only with: { caption, hashtags, cta }",
    ].join("\n"),
    userPrompt: [
      `Write a ${input.platform} post with a ${VARIANT_ANGLES[variantLabel]} angle.`,
      "",
      `Topic: ${input.topic}`,
      `Content pillar: ${input.pillar}`,
      `Target audience: ${input.audience}`,
      `Objective: ${input.objective}`,
      `Brand voice: ${input.voice}`,
      `CTA direction: ${input.cta}`,
      "",
      "Requirements:",
      `- Stay within ${pk.charLimit} characters`,
      `- Include ${pk.hashtagLimits.min}-${pk.hashtagLimits.max} hashtags (0 if platform doesn't use them)`,
      `- Follow the platform content rules above exactly`,
      `- Match the brand voice while adapting to the platform tone`,
      `- The CTA should feel natural to ${input.platform}`,
      "",
      "Return JSON: { \"caption\": \"...\", \"hashtags\": [\"#tag1\", ...], \"cta\": \"...\" }",
    ].join("\n"),
    temperature: 0.45,
    fallback: null as unknown as { caption: string; hashtags: string[]; cta: string },
  });

  if (!result || !result.caption) {
    throw new Error(`Content generation failed for ${input.platform} variant ${variantLabel}`);
  }

  return {
    variantLabel,
    caption: result.caption,
    hashtags: result.hashtags ?? [],
    cta: result.cta ?? input.cta,
  };
}

export async function generatePlatformVariants(input: ContentGenerationRequest): Promise<{
  variantGroup: string;
  variants: GeneratedVariant[];
}> {
  const labels: VariantLabel[] = input.generateVariants ? ["A", "B", "C"] : ["A"];
  const variants = await Promise.all(
    labels.map((label) => runPlatformWriterAgent(input, label))
  );
  return {
    variantGroup: crypto.randomUUID(),
    variants,
  };
}
```

### Downstream changes

**`src/app/api/content/generate/route.ts`** -- Line 22:
```typescript
// BEFORE:
const generated = generatePlatformVariants(parsed.data);
// AFTER:
const generated = await generatePlatformVariants(parsed.data);
```

---

## Phase 2: Platform-Specific Strategy Agent

### File to modify: `src/lib/agents/strategy/strategy-agent.ts`

### Current state
The agent generates a strategy but has zero platform knowledge -- it just says "platform-specific posting frequency" in the prompt without any actual platform data.

### Required changes

1. Import `getMultiPlatformPromptContext, PLATFORM_KNOWLEDGE` from `platform-knowledge.ts`
2. Add optional `platforms?: Platform[]` parameter (defaults to all 5)
3. Inject platform knowledge into the prompt

### Where to inject in the prompt

After the existing `"Requirements:"` section, add:

```
"Platform-specific guidance (use these when setting schedule, content mix, and weekly theme execution):",
getMultiPlatformPromptContext(platforms ?? ["instagram", "facebook", "linkedin", "x", "gbp"]),
"",
"CRITICAL RULES:",
"- Each platform's contentMix MUST ONLY include format types that platform supports (see formats above)",
"- Posting frequency must fall within the platform's posting norms range",
"- Weekly themes should include platform-specific execution notes",
"- Image dimensions and media specs must match platform requirements",
```

### Also: Accept competitor insights (Phase 13)

Add optional `competitorInsights?: string` parameter. If provided, add to prompt:
```
"Competitor intelligence (differentiate your strategy from these):",
competitorInsights,
```

---

## Phase 3: Platform-Specific Post Analyser

### File to modify: `src/lib/agents/analysis/post-analyser.ts`

### Current state
The agent receives `platform` as a string and mentions it once in the system prompt but uses identical analysis criteria for every platform.

### Required changes

1. Import `getPlatformPromptContext, PLATFORM_KNOWLEDGE` from `platform-knowledge.ts`
2. Create a `buildPlatformAnalysisContext(platform: Platform): string` function that returns platform-specific instructions
3. Inject into the user prompt's "Analysis requirements" section

### Platform-specific analysis instructions

```typescript
function buildPlatformAnalysisContext(platform: Platform): string {
  const pk = PLATFORM_KNOWLEDGE[platform];
  
  const platformSpecific: Record<Platform, string> = {
    instagram: [
      "Instagram-specific analysis:",
      "- Saves are the MOST important metric -- high saves = bookmark-worthy, algorithm-boosting content",
      "- Evaluate carousel completion rates (do people swipe through all slides?)",
      "- Reel view-through rate indicates content quality",
      "- Check hashtag effectiveness: are they driving discovery?",
      "- Does content follow hook-value-CTA structure?",
      "- Are images using optimal dimensions (1080x1080 feed, 1080x1350 portrait, 1080x1920 stories)?",
      "- A good engagement rate on Instagram is 1-3% (above 3% is excellent)",
    ].join("\n"),
    
    linkedin: [
      "LinkedIn-specific analysis:",
      "- Comment DEPTH matters more than comment count (long, thoughtful comments > short reactions)",
      "- Document/carousel (PDF) posts typically get highest organic reach -- are they being used?",
      "- Check if posts avoid outbound links in body (algorithm penalty)",
      "- Dwell time correlation: do longer posts hold attention?",
      "- Are posts ending with questions to drive discussion?",
      "- A good engagement rate on LinkedIn is 2-5% (above 5% is excellent)",
    ].join("\n"),
    
    x: [
      "X (Twitter)-specific analysis:",
      "- Quote tweets are the STRONGEST engagement signal (someone added their take)",
      "- Evaluate thread completion rates -- do people read to the end?",
      "- Check hashtag usage: more than 2 looks spammy on X",
      "- Are tweets concise enough? Wall-of-text tweets underperform",
      "- Reply-to-self pattern for threads -- is it being used?",
      "- A good engagement rate on X is 0.5-1% (above 1% is excellent)",
    ].join("\n"),
    
    facebook: [
      "Facebook-specific analysis:",
      "- Shares are the MOST valuable metric -- shared content reaches 3-5x more people",
      "- Comment sentiment matters: are comments positive, negative, or questions?",
      "- Do questions/polls drive more engagement than statements?",
      "- Video performance vs static image comparison",
      "- Community-building content vs promotional -- which performs better?",
      "- A good engagement rate on Facebook is 0.5-1% (above 1% is excellent)",
    ].join("\n"),
    
    gbp: [
      "Google Business Profile-specific analysis:",
      "- Action clicks (calls, directions, website) are the PRIMARY success metric",
      "- Is content locally relevant? Mentions of location/neighborhood matter for local SEO",
      "- Post recency: content posted within 7 days improves local search ranking",
      "- Are event/offer post types being utilized?",
      "- Photos should be of actual business/products, not stock",
      "- Track search impressions for local visibility",
    ].join("\n"),
  };
  
  return platformSpecific[platform];
}
```

### Where to inject
In the `userPrompt` array, after `"\nAnalysis requirements:"`, add:
```typescript
"",
buildPlatformAnalysisContext(platform),
"",
getPlatformPromptContext(platform),
```

---

## Phase 4: Platform-Aware Visual Designer

### File to modify: `src/lib/agents/content/visual-designer.ts`

### Current state
Always generates `{ imagePrompt, carousel (3 slides), storyTemplate }` regardless of platform. X doesn't support carousels. GBP doesn't support stories or carousels.

### Required changes

1. Import `PLATFORM_KNOWLEDGE, getPlatformPromptContext` from `platform-knowledge.ts`
2. Make `carousel` and `storyTemplate` optional in `VisualPlan` type:
   ```typescript
   export type VisualPlan = {
     imagePrompt: string;
     carousel?: Array<{ id: string; heading: string; body: string; imageUrl?: string }>;
     storyTemplate?: { template: "bold-offer" | "minimal-quote" | "countdown-launch"; ... };
     recommendedDimensions: { width: number; height: number; aspectRatio: string };
   };
   ```
3. Add `recommendedDimensions` to the type (from `PLATFORM_KNOWLEDGE[platform].mediaSpecs.dimensions[0]`)
4. Modify the prompt to only request visual formats the platform supports:
   ```typescript
   const pk = PLATFORM_KNOWLEDGE[draft.platform];
   const supportsCarousel = pk.visualFormats.includes("carousel");
   const supportsStory = pk.visualFormats.includes("story");
   ```
5. Update `buildFallbackVisualPlan()` to return `undefined` for carousel/story when platform doesn't support them
6. Include media specs in the prompt so AI generates correct dimension references

### Downstream: `src/app/api/drafts/[id]/visual-plan/route.ts`

Change line 47-49:
```typescript
// BEFORE:
const updated = await updateDraft(tenantId, id, {
  carousel: plan.carousel,
  storyTemplate: plan.storyTemplate,
  mediaType: "carousel",
});

// AFTER:
const pk = PLATFORM_KNOWLEDGE[draft.platform];
const mediaType = plan.carousel?.length ? "carousel" : 
                  plan.storyTemplate ? "story" : "image";
const updated = await updateDraft(tenantId, id, {
  ...(plan.carousel && { carousel: plan.carousel }),
  ...(plan.storyTemplate && { storyTemplate: plan.storyTemplate }),
  mediaType,
});
```

---

## Phase 5: Extract Strategy Suggest into Agent Module

### New file: `src/lib/agents/strategy/strategy-suggest-agent.ts`

### What to move from `src/app/api/strategy/suggest/route.ts`:
- `SECTION_DESCRIPTIONS` constant (lines 34-57)
- `SuggestionItem` type (lines 20-25)
- `SuggestResponse` type (lines 27-31)
- The entire `generateJson<SuggestResponse>({...})` call (lines 127-191)

### New function signature:
```typescript
export async function runStrategySuggestAgent(input: {
  section: "pillars" | "schedule" | "weeklyThemes";
  currentStrategy: { pillars: any[]; schedule: any[]; weeklyThemes: any[]; monthlyGoals: any[] };
  manifesto: Record<string, unknown>;
  savedStrategy?: Record<string, unknown>;
  postAnalyses?: PostAnalysis[];
}): Promise<SuggestResponse>
```

### Enhancements:
- Import `PLATFORM_KNOWLEDGE` for schedule suggestions
- When `section === "schedule"`, inject platform-specific posting norms and format support into the prompt

### Route simplification:
`src/app/api/strategy/suggest/route.ts` becomes ~40 lines:
```typescript
export async function POST(request: Request) {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  // ... validation ...
  // ... DB queries for manifesto, savedStrategy, postAnalyses ...
  const result = await runStrategySuggestAgent({ section, currentStrategy, manifesto, savedStrategy, postAnalyses });
  return NextResponse.json(result);
}
```

### Update `src/lib/agents/strategy/index.ts`:
```typescript
export { runStrategyAgent } from "./strategy-agent";
export { runStrategySuggestAgent } from "./strategy-suggest-agent";
```

---

## Phase 6: Enhanced Optimizer Agent

### File to modify: `src/lib/agents/optimization/optimizer-agent.ts`

### Current state
Only receives `tenantId`, fetches generic analytics overview and trends. No awareness of strategy, post analysis, or platform-specific optimization.

### Required changes

1. Change signature:
   ```typescript
   export async function runOptimizerAgent(
     tenantId: string,
     options?: {
       postAnalyses?: PostAnalysis[];
       strategy?: ContentStrategy;
     }
   ): Promise<OptimizationProposal[]>
   ```

2. Import `PLATFORM_KNOWLEDGE, getMultiPlatformPromptContext`

3. Enhance prompt with:
   - Platform-specific optimization knowledge
   - Current strategy's content mix per platform
   - Post analysis insights per platform (if available)

4. Add to `RawProposal` type:
   ```typescript
   type RawProposal = {
     proposalType: ProposalType;
     platform?: Platform; // NEW: which platform this proposal targets
     title: string;
     description: string;
     reasoning: string;
     data: Record<string, unknown>;
   };
   ```

5. Add `"platform_format_shift"` to `VALID_TYPES`

### Downstream: `src/app/api/proposals/route.ts`
Add ~10 lines to fetch strategy and analyses from DB and pass to the agent.

---

## Phase 7: AI-Powered Hashtag Generation

### File to modify: `src/lib/content/hashtags.ts`

### Add new async function:

```typescript
import { generateJson } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";

export async function suggestHashtagsAI({
  platform,
  pillar,
  topic,
  objective,
}: {
  platform: Platform;
  pillar: string;
  topic: string;
  objective: string;
}): Promise<string[]> {
  const pk = PLATFORM_KNOWLEDGE[platform];
  if (pk.hashtagLimits.max === 0) return [];

  const fallback = suggestHashtags({ platform, pillar, topic, objective });

  const result = await generateJson<{ hashtags: string[] }>({
    systemPrompt: `You are a ${platform} hashtag specialist. Generate hashtags that maximize discoverability.`,
    userPrompt: [
      `Generate ${pk.hashtagLimits.min}-${pk.hashtagLimits.max} hashtags for a ${platform} post.`,
      `Topic: ${topic}`,
      `Content pillar: ${pillar}`,
      `Objective: ${objective}`,
      "",
      platform === "instagram" ? "Mix: 40% high-volume (500K+), 40% niche (10K-100K), 20% branded/specific." :
      platform === "linkedin" ? "Use professional, industry-specific hashtags." :
      platform === "x" ? "1-2 only. Make them trending or highly relevant." :
      "Use relevant, specific hashtags.",
      "",
      'Return JSON: { "hashtags": ["#tag1", "#tag2", ...] }',
    ].join("\n"),
    temperature: 0.3,
    fallback: { hashtags: fallback },
  });

  return result.hashtags ?? fallback;
}
```

Keep existing `suggestHashtags()` unchanged as fallback.

---

## Phase 8: Streaming Responses

### Goal
Replace blocking JSON responses with Server-Sent Events for content generation and strategy creation so the UI shows progress in real-time.

### New: `src/lib/ai/clients.ts` additions

Add a `generateTextStream()` function:

```typescript
export async function generateTextStream(
  options: GenerateTextOptions
): Promise<ReadableStream<string>> {
  // Use Gemini's streaming endpoint (streamGenerateContent)
  // Fall back to Groq's streaming (stream: true)
  // Return a ReadableStream that yields text chunks
}
```

### Update: `src/app/api/content/generate/route.ts`

Return SSE stream:
```typescript
export async function POST(request: Request) {
  // ... auth, validation ...
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      
      for (const label of labels) {
        send("progress", { variant: label, status: "generating" });
        const variant = await runPlatformWriterAgent(input, label);
        send("variant", variant);
      }
      
      send("done", { variantGroup });
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Update: `src/components/content-generation-studio.tsx`

Replace `fetch()` with `EventSource` or `fetch()` + `ReadableStream` reader:
```typescript
const response = await fetch("/api/content/generate", { method: "POST", body, headers });
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE events, update state progressively
}
```

### Update: `src/app/api/strategy/generate/route.ts` and `src/components/strategy-builder.tsx`
Same SSE pattern for strategy generation.

---

## Phase 9: AI-Powered Content Revision

### New file: `src/lib/agents/content/revision-agent.ts`

```typescript
import { generateJson } from "@/lib/ai/clients";
import { getPlatformPromptContext, PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { BrandManifesto } from "@/lib/types";

type RevisionResult = {
  revisedCaption: string;
  revisedHashtags: string[];
  revisedCta: string;
  changesSummary: string;
  changesApplied: Array<{ what: string; why: string }>;
};

export async function runRevisionAgent({
  draft,
  revisionNotes,
  manifesto,
}: {
  draft: ContentDraftRecord;
  revisionNotes: string;
  manifesto: BrandManifesto;
}): Promise<RevisionResult> {
  const platformContext = getPlatformPromptContext(draft.platform);

  const result = await generateJson<RevisionResult>({
    systemPrompt: [
      `You are a content revision specialist for ${draft.platform}.`,
      "Apply the reviewer's feedback to improve the content while maintaining brand voice and platform rules.",
      "",
      platformContext,
    ].join("\n"),
    userPrompt: [
      "## Current draft:",
      `Caption: ${draft.caption}`,
      `Hashtags: ${draft.hashtags.join(", ")}`,
      `CTA: ${draft.cta}`,
      `Platform: ${draft.platform}`,
      `Pillar: ${draft.pillar}`,
      "",
      "## Reviewer's feedback:",
      revisionNotes,
      "",
      "## Brand voice reference:",
      JSON.stringify({
        voiceAttributes: manifesto.voiceAttributes,
        toneSpectrum: manifesto.toneSpectrum,
        contentDos: manifesto.contentDos,
        contentDonts: manifesto.contentDonts,
      }),
      "",
      "Apply the feedback precisely. Explain each change.",
      'Return JSON: { "revisedCaption": "...", "revisedHashtags": [...], "revisedCta": "...", "changesSummary": "...", "changesApplied": [{"what": "...", "why": "..."}] }',
    ].join("\n"),
    temperature: 0.3,
    fallback: {
      revisedCaption: draft.caption,
      revisedHashtags: draft.hashtags,
      revisedCta: draft.cta,
      changesSummary: "Unable to process revision automatically.",
      changesApplied: [],
    },
  });

  return result;
}
```

### New API route: `src/app/api/drafts/[id]/ai-revise/route.ts`

POST endpoint that:
1. Fetches the draft and brand manifesto
2. Calls `runRevisionAgent()`
3. Returns the revision result (does NOT auto-apply -- user decides)

### Update: `src/app/(dashboard)/approval/page.tsx`

Add an "AI Revise" button visible when draft status is `revision-requested`:
- Calls `/api/drafts/${id}/ai-revise`
- Shows a side-by-side diff of original vs revised content
- "Apply Revision" button to accept the AI's changes
- "Edit Manually" to keep the original and edit by hand

---

## Phase 10: A/B Test Scoring

### New file: `src/lib/agents/content/ab-scoring-agent.ts`

```typescript
type ABScoreResult = {
  winner: VariantLabel;
  scores: Record<VariantLabel, {
    engagementRate: number;
    strengthSignal: string; // e.g., "saves" for Instagram
    strengthValue: number;
    overallScore: number;
  }>;
  insights: string[];
  learnedPreference: {
    platform: Platform;
    winningAngle: string; // "educational" | "story-driven" | "results-first"
    margin: number; // percentage difference
  };
};

export async function runABScoringAgent(params: {
  variants: Array<ContentDraftRecord & { analytics?: Record<string, number> }>;
  platform: Platform;
  manifesto: BrandManifesto;
}): Promise<ABScoreResult>
```

### New file: `src/lib/content/variant-learnings.ts`

Store/retrieve learnings:
```typescript
export async function saveVariantLearning(learning: {
  tenantId: string;
  platform: Platform;
  winningAngle: string;
  margin: number;
  sampleSize: number;
}): Promise<void>

export async function getVariantLearnings(
  tenantId: string,
  platform: Platform
): Promise<VariantLearning[]>
```

### DB schema update: `src/lib/db/schema.ts`

Add `variantLearnings` table:
```typescript
export const variantLearnings = pgTable("variant_learnings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  platform: text("platform").notNull(),
  winningAngle: text("winning_angle").notNull(),
  margin: real("margin").notNull(),
  sampleSize: integer("sample_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### New migration: `src/lib/db/migrations/0004_variant_learnings.sql`

### New API route: `src/app/api/analytics/ab-score/route.ts`

### Integration with Phase 1 (content writer):
When generating content, fetch learnings for the platform and include in the prompt:
```
"Historical performance data for this platform shows that {winningAngle} content 
outperforms by {margin}%. Weight your tone and structure accordingly."
```

---

## Phase 11: Conversational Content Refinement

### New file: `src/lib/agents/content/refinement-agent.ts`

```typescript
export async function runRefinementAgent({
  draft,
  instruction,
  manifesto,
}: {
  draft: ContentDraftRecord;
  instruction: string; // e.g., "make it more casual", "add a statistic", "shorter"
  manifesto: BrandManifesto;
}): Promise<{
  refinedCaption: string;
  refinedHashtags: string[];
  refinedCta: string;
  explanation: string;
}>
```

Key prompt design:
- System: "You are a content editor. Apply the user's instruction precisely."
- Include platform knowledge (char limits, rules)
- Include brand voice constraints
- Must NOT exceed platform limits after refinement

### New API route: `src/app/api/drafts/[id]/refine/route.ts`
- POST with `{ instruction: "make it more casual" }`
- Returns refined content
- Uses streaming (Phase 8) for real-time feedback

### New component: `src/components/content-refiner.tsx`

A chat-like input panel:
- Text input at bottom: "Tell me how to change this..."
- Shows refinement history as a conversation
- Each refinement has "Apply" and "Revert" buttons
- Respects platform character limits (shows count)

### Update: `src/components/drafts-editor.tsx`
Integrate `<ContentRefiner />` component below the caption editor area.

---

## Phase 12: Cross-Platform Caption Rewriter

### New file: `src/lib/agents/content/cross-platform-agent.ts`

```typescript
type CrossPlatformResult = Record<Platform, {
  caption: string;
  hashtags: string[];
  cta: string;
  mediaType: string;
  recommendedDimensions: { width: number; height: number; aspectRatio: string };
}>;

export async function runCrossPlatformAgent({
  caption,
  sourcePlatform,
  targetPlatforms,
  manifesto,
  pillar,
  topic,
}: {
  caption: string;
  sourcePlatform: Platform;
  targetPlatforms: Platform[];
  manifesto: BrandManifesto;
  pillar: string;
  topic: string;
}): Promise<CrossPlatformResult>
```

Key prompt design:
- "Adapt this caption from {source} to {target}. The content message stays the same but tone, length, format, and style must match {target}'s requirements."
- For each target platform, inject `getPlatformPromptContext(target)`
- Include media specs so the response recommends correct image dimensions

### New API route: `src/app/api/content/cross-platform/route.ts`
- POST with `{ draftId, targetPlatforms: ["linkedin", "x"] }`
- Fetches the source draft, brand manifesto
- Calls `runCrossPlatformAgent()`
- Creates new drafts for each target platform (in the same variant group)
- Returns the new drafts

### UI Update
In `src/components/drafts-editor.tsx` or `src/components/content-generation-studio.tsx`:
- Add "Adapt for other platforms" button on any draft card
- Platform picker (checkboxes for connected platforms minus current)
- Preview adapted versions before creating drafts
- "Create Drafts" button to save all adapted versions

---

## Phase 13: Competitor Analysis Integration

### File to modify: `src/lib/agents/competitors/competitor-agent.ts`

### Add aggregation function:

```typescript
export async function getCompetitorInsightsForStrategy(
  tenantId: string
): Promise<string | null> {
  const competitors = await listCompetitors(tenantId);
  const analyzed = competitors.filter(c => c.latestAnalysis);
  
  if (analyzed.length === 0) return null;
  
  // Format competitor insights as a prompt-ready string
  return analyzed.map(c => [
    `Competitor: ${c.name} (${c.platform})`,
    `Posting: ${c.latestAnalysis.postingFrequency}`,
    `Content types: ${c.latestAnalysis.contentTypes.join(", ")}`,
    `Top themes: ${c.latestAnalysis.topThemes.join(", ")}`,
    `Engagement: ${c.latestAnalysis.engagementRate}`,
    `Summary: ${c.latestAnalysis.summary}`,
  ].join("\n")).join("\n\n");
}
```

### Update: `src/app/api/strategy/generate/route.ts`

Add competitor insights fetch:
```typescript
import { getCompetitorInsightsForStrategy } from "@/lib/agents/competitors";

// In the handler:
const competitorInsights = await getCompetitorInsightsForStrategy(tenantId);
const strategy = await runStrategyAgent(manifesto, postAnalyses, platforms, competitorInsights);
```

### Update: `src/lib/agents/strategy/strategy-agent.ts` (from Phase 2)

Accept the `competitorInsights` parameter and inject into prompt:
```
"## Competitor Intelligence (differentiate from these):",
competitorInsights,
"Use these insights to: find content gaps competitors miss, avoid saturated topics, and identify unique angles.",
```

### New API route: `src/app/api/competitors/insights/route.ts`
GET endpoint that returns aggregated competitor insights for the dashboard.

---

## Implementation Order

Execute phases in this order (each phase should be completed and verified before moving to the next):

| Order | Phase | Risk | Depends On |
|-------|-------|------|------------|
| 1 | Phase 0: Platform Knowledge Module | Low | Nothing |
| 2 | Phase 5: Strategy Suggest Extraction | Low | Nothing |
| 3 | Phase 3: Post Analyser Enhancement | Low | Phase 0 |
| 4 | Phase 2: Strategy Agent Enhancement | Low | Phase 0 |
| 5 | Phase 4: Visual Designer Enhancement | Medium | Phase 0 |
| 6 | Phase 7: AI Hashtags | Low | Phase 0 |
| 7 | Phase 1: Content Writer Rewrite | Medium | Phase 0, Phase 7 |
| 8 | Phase 6: Optimizer Enhancement | Low | Phase 0 |
| 9 | Phase 8: Streaming Responses | Medium | Phase 1 |
| 10 | Phase 9: AI Revision | Low | Phase 0 |
| 11 | Phase 10: A/B Scoring | Medium | Phase 0 |
| 12 | Phase 11: Conversational Refinement | Medium | Phase 0, Phase 8 |
| 13 | Phase 12: Cross-Platform Rewriter | Medium | Phase 0 |
| 14 | Phase 13: Competitor Integration | Low | Phase 2 |

---

## Verification Checklist

After EACH phase, run:
```bash
npx tsc --noEmit   # Type check
npm run build       # Build check
```

### Phase-specific verification:

- [ ] **Phase 0**: Import `PLATFORM_KNOWLEDGE` in a test file, verify all 5 platforms have complete data
- [ ] **Phase 5**: Call `/api/strategy/suggest` -- verify identical response to before
- [ ] **Phase 3**: Call `/api/platforms/analyse` for different platforms -- verify analysis mentions platform-specific metrics
- [ ] **Phase 2**: Call `/api/strategy/generate` -- verify strategy includes platform-specific formats and posting norms
- [ ] **Phase 4**: Call `/api/drafts/[id]/visual-plan` for X (should NOT have carousel) and Instagram (should have all three)
- [ ] **Phase 7**: Verify AI-generated hashtags are contextually relevant and within platform limits
- [ ] **Phase 1**: Call `/api/content/generate` -- verify AI-generated captions, NOT template strings. Verify platform-specific tone.
- [ ] **Phase 6**: Call `/api/proposals` -- verify proposals include platform-specific recommendations
- [ ] **Phase 8**: Call `/api/content/generate` -- verify SSE stream arrives in the browser
- [ ] **Phase 9**: Create a draft with revision notes, call `/api/drafts/[id]/ai-revise` -- verify revision addresses notes
- [ ] **Phase 10**: Publish 3 variants, collect analytics, call `/api/analytics/ab-score` -- verify scoring and learning storage
- [ ] **Phase 11**: Call `/api/drafts/[id]/refine` with "make it shorter" -- verify caption is shorter
- [ ] **Phase 12**: Call `/api/content/cross-platform` with Instagram draft targeting LinkedIn -- verify LinkedIn-appropriate tone and format
- [ ] **Phase 13**: Discover competitors, analyze them, then generate strategy -- verify strategy mentions competitive differentiation

---

## Key Files Reference

### Files that MUST exist before implementation:
- `src/lib/ai/clients.ts` -- AI client (Gemini/Groq)
- `src/lib/constants.ts` -- Platform char limits, hashtag limits
- `src/lib/types.ts` -- BrandManifesto, ContentStrategy, PostAnalysis, Platform
- `src/lib/content/types.ts` -- GeneratedVariant, ContentDraftRecord, VisualPlan schemas
- `src/lib/content/platform-defaults.ts` -- PLATFORM_TONE_PROFILE, deriveFieldsForPlatform
- `src/lib/db/schema.ts` -- Database schema

### New files to create (in order):
1. `src/lib/agents/platform-knowledge.ts`
2. `src/lib/agents/strategy/strategy-suggest-agent.ts`
3. `src/lib/agents/content/revision-agent.ts`
4. `src/lib/agents/content/ab-scoring-agent.ts`
5. `src/lib/agents/content/refinement-agent.ts`
6. `src/lib/agents/content/cross-platform-agent.ts`
7. `src/lib/content/variant-learnings.ts`
8. `src/components/content-refiner.tsx`
9. `src/app/api/drafts/[id]/ai-revise/route.ts`
10. `src/app/api/drafts/[id]/refine/route.ts`
11. `src/app/api/content/cross-platform/route.ts`
12. `src/app/api/analytics/ab-score/route.ts`
13. `src/app/api/competitors/insights/route.ts`
14. `src/lib/db/migrations/0004_variant_learnings.sql`
