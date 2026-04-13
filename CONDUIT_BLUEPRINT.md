# CONDUIT — AI Social Media Manager Blueprint

> **Single Source of Truth** for vision, architecture, schema, agents, data models, and implementation phases.
> If context is ever lost, this file contains everything needed to continue building.

---

## Table of Contents

1. [Vision & Purpose](#1-vision--purpose)
2. [Target Users](#2-target-users)
3. [Tech Stack (Detailed)](#3-tech-stack-detailed)
4. [Installed Dependencies](#4-installed-dependencies)
5. [Roles & Permissions System](#5-roles--permissions-system)
6. [Supported Platforms](#6-supported-platforms)
7. [Platform Constants & Limits](#7-platform-constants--limits)
8. [Agent Architecture (15 Agents)](#8-agent-architecture-15-agents)
9. [The Conduit Loop (End-to-End Flow)](#9-the-conduit-loop-end-to-end-flow)
10. [Business Onboarding Methods](#10-business-onboarding-methods)
11. [Brand Manifesto (Data Model)](#11-brand-manifesto-data-model)
12. [Brand Voice System](#12-brand-voice-system)
13. [Content Strategy (Data Model)](#13-content-strategy-data-model)
14. [Content Types & Formats](#14-content-types--formats)
15. [A/B/C Variant Testing](#15-abc-variant-testing)
16. [Approval Workflow](#16-approval-workflow)
17. [Analytics & Metrics](#17-analytics--metrics)
18. [Optimization & Learning Loop](#18-optimization--learning-loop)
19. [Competitor Analysis](#19-competitor-analysis)
20. [Notifications](#20-notifications)
21. [Database Schema (Full)](#21-database-schema-full)
22. [Authentication System](#22-authentication-system)
23. [Security & Encryption](#23-security--encryption)
24. [File Storage (Cloudflare R2)](#24-file-storage-cloudflare-r2)
25. [Environment Variables](#25-environment-variables)
26. [Route Map](#26-route-map)
27. [File Structure](#27-file-structure)
28. [API Endpoints](#28-api-endpoints)
29. [Implementation Phases](#29-implementation-phases)
30. [Development Notes & Conventions](#30-development-notes--conventions)

---

## 1. Vision & Purpose

Conduit is an AI-powered **Senior Social Media Manager**. It doesn't just generate posts — it operates as a full marketing team member that:

- **Discovers** your brand identity by scraping your website, reading your documents, and importing social profiles
- **Plans** a content strategy with pillars, weekly themes, posting schedules, and a content calendar
- **Writes** platform-specific content with dedicated writer agents that understand each platform's culture, format, and constraints
- **Designs** visuals including AI-generated images, carousels, story templates, and Reels/Shorts overlays
- **Seeks approval** through a multi-stage workflow: Draft → Review → Revise → Approve → Schedule
- **Publishes** at AI-determined optimal times via direct platform API integration
- **Analyzes** performance by pulling real metrics from each platform
- **Improves** by proposing strategy changes based on analytics — then loops back and does it all again, better

The core principle is a **continuous improvement loop** where AI proposes and humans approve. The AI gets smarter with every cycle.

### Development Approach
This is a **guided learning project** — concepts are explained as we build. It may become a real product later, but learning comes first. We use subagents to explore topics and build understanding.

### MVP Scope
Full loop: onboard a business → generate content → schedule posts → publish → pull analytics → optimize → repeat.

---

## 2. Target Users

| Segment | Description |
|---|---|
| **Solo entrepreneurs** | Single person managing their own brand, needs automation |
| **SMB marketing teams** | 2–10 people, need collaboration & approval workflows |
| **Agencies** | Managing multiple client brands (future multi-tenant) |

**Tenancy approach**: Start single-tenant, but the database schema is designed with `tenant_id` on every business table so multi-tenant support can be added later without migration pain.

---

## 3. Tech Stack (Detailed)

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.2 | App Router, server components, API routes, middleware |
| **React** | 19.2.4 | UI rendering with Server Components + Client Components |
| **TypeScript** | ^5 | Type safety across the entire codebase |
| **Tailwind CSS** | v4 | Utility-first styling (v4 uses CSS-first config, not tailwind.config.js) |
| **shadcn/ui** | v4.1.2 | Component library built on @base-ui/react (NOT Radix — shadcn v4 migrated) |
| **Lucide React** | ^1.7.0 | Icon library |

### Backend / Data
| Technology | Version | Purpose |
|---|---|---|
| **Neon Postgres** | serverless | Managed PostgreSQL with HTTP driver for edge compatibility |
| **Drizzle ORM** | ^0.45.2 | Type-safe SQL query builder + schema definition |
| **Drizzle Kit** | ^0.31.10 | Migration generation & push |
| **Auth.js (next-auth)** | v5 beta | Authentication — Credentials + Google OAuth providers |
| **@auth/drizzle-adapter** | ^1.11.1 | Drizzle adapter for Auth.js session/account tables |
| **bcryptjs** | ^3.0.3 | Password hashing |
| **Zod** | v4 (^4.3.6) | Schema validation (NOTE: v4, not v3 — uses `.issues` not `.errors`) |
| **uuid** | ^13.0.0 | UUID generation |

### Storage & Security
| Technology | Purpose |
|---|---|
| **Cloudflare R2** via `@aws-sdk/client-s3` | File storage for images, PDFs, brand assets |
| **AES-256-GCM** (Node.js `crypto`) | Encryption for platform API tokens |

### AI & Agents (Planned — Phase 2+)
| Technology | Purpose |
|---|---|
| **LangGraph.js** | Multi-agent orchestration with state graphs |
| **Gemini 2.0 Flash** | Primary LLM — free tier, fast, good quality |
| **Gemini 1.5 Pro** | Complex synthesis tasks (Brand Manifesto, strategy) |
| **Groq Llama 3.3 70B** | Fast fallback LLM |
| **Firecrawl** | Web scraping (website crawling for brand discovery) |
| **Jina Reader** | URL-to-clean-text extraction for scraping |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Vercel** | Deployment (edge functions, serverless) |
| **GitHub** | Source control |

### Important shadcn/ui v4 Notes
- Uses `@base-ui/react` instead of Radix UI primitives
- Components use `render` prop pattern instead of `asChild` (e.g., `<SidebarMenuButton render={<a href="/foo" />}>`)
- Uses `useRender` hook internally
- CSS-first configuration — no `components.json` config for themes
- Install components with `npx shadcn@latest add <component>`

---

## 4. Installed Dependencies

### Production
```
@auth/drizzle-adapter  @aws-sdk/client-s3  @base-ui/react  @neondatabase/serverless
bcryptjs  class-variance-authority  clsx  drizzle-orm  lucide-react
next  next-auth  react  react-dom  shadcn  tailwind-merge
tw-animate-css  uuid  zod
```

### Development
```
@tailwindcss/postcss  @types/bcryptjs  @types/node  @types/react
@types/react-dom  @types/uuid  drizzle-kit  eslint  eslint-config-next
tailwindcss  typescript
```

### shadcn/ui Components Installed
```
sidebar (sidebar-07 block)  avatar  badge  separator  tooltip
dropdown-menu  sheet  input  label  card  skeleton  breadcrumb
collapsible  button
```

---

## 5. Roles & Permissions System

Three user roles with granular permissions defined in `src/lib/auth/permissions.ts`:

### Permission Matrix

| Permission | Admin | Creator | Approver | Description |
|---|:---:|:---:|:---:|---|
| `manage_workspace` | ✓ | | | Tenant settings, billing |
| `invite_members` | ✓ | | | Add/remove team members |
| `connect_platforms` | ✓ | | | Set up platform API connections |
| `edit_manifesto` | ✓ | ✓ | | Edit the Brand Manifesto |
| `generate_content` | ✓ | ✓ | | Trigger AI content generation |
| `edit_drafts` | ✓ | ✓ | | Edit content drafts |
| `submit_for_approval` | ✓ | ✓ | | Submit drafts for review |
| `approve_content` | ✓ | | ✓ | Approve or request revision on drafts |
| `view_analytics` | ✓ | ✓ | ✓ | View analytics dashboards |
| `approve_strategy` | ✓ | | ✓ | Approve AI-proposed strategy changes |

### Helper Functions
- `hasPermission(role, permission)` — check if a role has a permission
- `requireAuth()` — get session or throw "Unauthorized"
- `requirePermission(permission)` — get session + check permission or throw "Forbidden"

---

## 6. Supported Platforms

| Platform | Key | Label |
|---|---|---|
| Instagram | `instagram` | Instagram |
| Facebook | `facebook` | Facebook |
| LinkedIn | `linkedin` | LinkedIn |
| X (Twitter) | `x` | X (Twitter) |
| Google Business Profile | `gbp` | Google Business Profile |

All platforms use **direct API posting**. Users are guided through API key/OAuth setup for each platform within the app. Each platform has a dedicated Writer Agent that understands its unique culture, formats, and constraints.

---

## 7. Platform Constants & Limits

Defined in `src/lib/constants.ts`:

### Character Limits
| Platform | Max Characters |
|---|---|
| Instagram | 2,200 |
| Facebook | 63,206 |
| LinkedIn | 3,000 |
| X (Twitter) | 280 |
| GBP | 1,500 |

### Hashtag Limits
| Platform | Min | Max |
|---|---|---|
| Instagram | 20 | 30 |
| Facebook | 2 | 5 |
| LinkedIn | 3 | 5 |
| X (Twitter) | 1 | 3 |
| GBP | 0 | 0 |

---

## 8. Agent Architecture (15 Agents)

Conduit uses **LangGraph.js** to orchestrate 15 specialized agents organized into 3 pipelines. Each agent has a single responsibility. The key design decision is **one writer agent per platform** — because each social platform has fundamentally different content culture, formatting rules, and audience expectations.

### Discovery Pipeline (Agents 1–3)
These agents run during onboarding to understand the business.

#### 1. Scraper Agent
- **Input**: Website URL, social profile URLs, Google Business Profile URL
- **Tools**: Firecrawl (deep website crawl), Jina Reader (URL-to-text)
- **Output**: Raw scraped text, extracted metadata, business information
- **LLM**: Gemini 2.0 Flash
- Crawls about page, products/services pages, team page, blog, reviews

#### 2. Document Analyst Agent
- **Input**: Uploaded PDFs, DOCX files, images (brand guidelines, pitch decks, etc.)
- **Tools**: Document parsers, OCR if needed
- **Output**: Extracted brand information, structured data
- **LLM**: Gemini 1.5 Pro (long context for large documents)
- Handles brand guideline PDFs, marketing decks, product brochures

#### 3. Identity Synthesizer Agent
- **Input**: All outputs from Scraper + Document Analyst + manual form data
- **Tools**: None (pure LLM synthesis)
- **Output**: Complete Brand Manifesto (see §11)
- **LLM**: Gemini 1.5 Pro (complex synthesis task)
- Resolves conflicts between sources, fills gaps, ensures consistency
- User reviews and edits the output (human-in-the-loop)

### Creative Pipeline (Agents 4–10)
These agents create content based on the Brand Manifesto and Content Strategy.

#### 4. Strategy Agent
- **Input**: Brand Manifesto, current analytics (if any), competitor data (if any)
- **Output**: Content Strategy with pillars, schedule, weekly themes, calendar
- **LLM**: Gemini 1.5 Pro
- Generates 4–6 content pillars with percentage allocation
- Creates platform-specific posting schedules
- Plans weekly themes for 4+ weeks ahead
- Sets monthly goals per platform

#### 5. LinkedIn Writer Agent
- **Platform traits**: Professional, thought-leadership, long-form welcome
- **Tone**: Business-casual to formal, industry expertise
- **Format**: Long posts (up to 3,000 chars), minimal hashtags (3–5), document/article carousels
- **Special**: Personal branding hooks, "hot take" openings, storytelling structure

#### 6. Instagram Writer Agent
- **Platform traits**: Visual-first, aspirational, community-driven
- **Tone**: Casual, relatable, authentic
- **Format**: Punchy captions (under 2,200 chars), heavy hashtags (20–30), carousel slide text, Reel hooks
- **Special**: Hook-first writing, emoji-integrated, CTA to bio link, carousel storytelling

#### 7. Facebook Writer Agent
- **Platform traits**: Community, conversational, link-friendly
- **Tone**: Warm, inclusive, question-asking
- **Format**: Medium-length posts, light hashtags (2–5), link previews, group-oriented
- **Special**: Conversation starters, share-worthy content, event promotion format

#### 8. X (Twitter) Writer Agent
- **Platform traits**: Brevity, wit, trending conversations
- **Tone**: Punchy, opinionated, timely
- **Format**: 280 chars max, threads for long-form, minimal hashtags (1–3), quote-tweet bait
- **Special**: Thread architecture (hook → body → CTA), ratio-proof opinions, trend-riding

#### 9. GBP Writer Agent
- **Platform traits**: Local SEO, business updates, offers
- **Tone**: Professional, helpful, clear
- **Format**: Structured posts (1,500 chars max), no hashtags, local keywords
- **Special**: Google Post types (update, offer, event), local SEO optimization, CTA buttons

#### 10. Visual Designer Agent
- **Input**: Caption text, brand manifesto (colors, style), content type
- **Tools**: AI image generation API, template system
- **Output**: Generated images, carousel slide designs, story templates
- **LLM**: Gemini 2.0 Flash (for prompt generation) + image gen model
- Hybrid approach: AI generation + canvas editor for manual tweaks

### Operations Pipeline (Agents 11–15)
These agents handle publishing, monitoring, and optimization.

#### 11. Scheduler Agent
- **Input**: Approved drafts, platform analytics, audience activity data
- **Output**: Optimal posting times, queue order
- **LLM**: Gemini 2.0 Flash
- Considers timezone, audience activity patterns, platform algorithm preferences
- Avoids posting conflicts across platforms
- User confirms suggested times

#### 12. Publisher Agent
- **Input**: Scheduled drafts at their posting time
- **Tools**: Platform API clients (Instagram Graph API, Facebook Pages API, LinkedIn API, X API v2, Google Business Profile API)
- **Output**: Published post IDs, success/failure status
- Handles rate limits, retries, error reporting
- Updates draft status: scheduled → published or → failed

#### 13. Analytics Agent
- **Input**: Published post IDs, platform API credentials
- **Tools**: Platform analytics APIs
- **Output**: Per-post metrics, trend data, dashboard aggregations
- **LLM**: Gemini 2.0 Flash (for insight generation)
- Pulls metrics on a schedule (e.g., 24h, 48h, 7d after posting)
- Identifies top performers, underperformers, trends

#### 14. Optimizer Agent
- **Input**: Analytics data, current strategy, Brand Manifesto
- **Output**: Optimization proposals (strategy changes)
- **LLM**: Gemini 1.5 Pro (complex analysis)
- Proposes changes to: content pillars, posting schedule, tone, content formats
- Each proposal includes reasoning and expected impact
- User approves/rejects proposals (semi-autonomous)

#### 15. Competitor Agent
- **Input**: Brand industry, location, existing competitor list
- **Tools**: Firecrawl, social profile scrapers
- **Output**: Competitor profiles, activity analysis, content strategy insights
- **LLM**: Gemini 2.0 Flash
- AI-discovers competitors based on industry + location
- Users can also manually add competitors
- Periodic re-analysis on a schedule

---

## 9. The Conduit Loop (End-to-End Flow)

```
┌──────────────────────────────────────────────────────────────────┐
│                        THE CONDUIT LOOP                          │
│                                                                  │
│  1. USER INPUTS                                                  │
│     Website URL / PDF upload / Manual form / Social profiles     │
│                         ↓                                        │
│  2. DISCOVERY PIPELINE                                           │
│     Scraper → Document Analyst → Identity Synthesizer            │
│                         ↓                                        │
│  3. BRAND MANIFESTO                                              │
│     AI generates → User reviews & edits (human-in-the-loop)     │
│                         ↓                                        │
│  4. STRATEGY GENERATION                                          │
│     Strategy Agent → Content pillars, schedule, calendar         │
│                         ↓                                        │
│  5. CONTENT CREATION                                             │
│     Per-platform Writer Agents → Drafts (A/B/C variants)        │
│     Visual Designer Agent → Images, carousels, stories           │
│                         ↓                                        │
│  6. APPROVAL WORKFLOW                                            │
│     Draft → Submit → Review → Approve/Revise → Scheduled        │
│                         ↓                                        │
│  7. PUBLISHING                                                   │
│     Scheduler Agent → optimal time → Publisher Agent → post      │
│                         ↓                                        │
│  8. ANALYTICS                                                    │
│     Analytics Agent → pull metrics → generate insights           │
│                         ↓                                        │
│  9. OPTIMIZATION                                                 │
│     Optimizer Agent → propose strategy changes                   │
│     User approves → LOOP BACK TO STEP 4                         │
│                                                                  │
│  ∞  CONTINUOUS IMPROVEMENT — each cycle gets smarter             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Business Onboarding Methods

The onboarding wizard supports 5 discovery methods, all feeding into the Identity Synthesizer:

| Method | Agent | What It Extracts |
|---|---|---|
| **Website URL** | Scraper Agent | Business name, products/services, about text, team info, values, visual style |
| **PDF/doc upload** | Document Analyst | Brand guidelines, pitch decks, marketing materials, product sheets |
| **Manual questionnaire** | None (direct input) | Form-based entry for business info, tone preferences, goals |
| **Social profile import** | Scraper Agent | Existing content style, posting patterns, audience, bio text |
| **Google Business Profile** | Scraper Agent | Business category, hours, reviews, location, photos, services |

### Onboarding Flow
1. Choose one or more discovery methods
2. Input URLs / upload files / fill form
3. Agents process in parallel
4. Identity Synthesizer merges all sources into a Brand Manifesto draft
5. User reviews, edits, and confirms the Brand Manifesto
6. Brand Manifesto is saved → triggers Strategy Agent

---

## 11. Brand Manifesto (Data Model)

The Brand Manifesto is the **core identity document** for a business. It's stored as JSONB in `brand_manifestos.data` and validated by `brandManifestoSchema` (Zod).

### Full Schema

```typescript
{
  // Identity
  businessName: string,
  tagline?: string,
  industry: string,
  subIndustry?: string,
  missionStatement?: string,
  vision?: string,
  coreValues: string[],

  // Products & Services
  productsServices: [{
    name: string,
    description: string,
    targetAudience?: string,
  }],
  uniqueSellingPropositions: string[],

  // Audiences
  primaryAudience: {
    demographics: string,     // e.g. "25-45 year old professionals"
    psychographics: string,   // e.g. "value efficiency, tech-savvy"
    painPoints?: string[],    // e.g. ["too little time for marketing"]
    desires?: string[],       // e.g. ["grow their brand online"]
  },
  secondaryAudiences?: Audience[],

  // Voice & Tone
  voiceAttributes: string[],  // e.g. ["authoritative", "friendly", "witty"]
  toneSpectrum: {
    formal: 1-10,      // 1 = very casual, 10 = very formal
    playful: 1-10,     // 1 = serious, 10 = very playful
    technical: 1-10,   // 1 = simple, 10 = very technical
    emotional: 1-10,   // 1 = rational, 10 = very emotional
    provocative: 1-10, // 1 = safe, 10 = very provocative
  },
  languageStyle: {
    sentenceLength: "short" | "medium" | "long" | "varied",
    vocabulary: "simple" | "professional" | "technical" | "mixed",
    perspective: "first-person" | "third-person" | "mixed",
    emojiUsage: "none" | "minimal" | "moderate" | "heavy",
  },

  // Content Guardrails
  contentDos: string[],           // e.g. ["Use data to back claims"]
  contentDonts: string[],         // e.g. ["Never criticize competitors by name"]
  bannedWords?: string[],         // e.g. ["cheap", "guarantee"]
  requiredDisclosures?: string[], // e.g. ["#ad for sponsored content"]

  // Visual Identity
  brandColors?: { primary: string, secondary: string, accent: string },
  fontPreferences?: string[],
  logoUrl?: string,
  visualStyle?: string,  // e.g. "minimalist, clean, modern photography"

  // Goals
  socialMediaGoals: string[],  // e.g. ["Increase brand awareness", "Drive website traffic"]
  keyMessages: string[],       // e.g. ["We make marketing effortless"]
}
```

### How It's Used
- Every Writer Agent receives the Brand Manifesto as context
- Ensures all generated content is on-brand
- The manifesto is **versioned** — edits create new versions, old ones are preserved
- AI evolves the manifesto over time as the Optimizer proposes voice/tone changes

---

## 12. Brand Voice System

The Brand Voice is a subset of the Brand Manifesto focused on language and tone. It consists of:

### Tone Spectrum (5 Axes)
Each axis is a 1–10 scale that gives the AI a nuanced understanding of where the brand falls:

| Axis | Low (1) | High (10) | Example Brand |
|---|---|---|---|
| **Formal** | Casual, slang OK | Corporate, polished | Low: Wendy's / High: McKinsey |
| **Playful** | Dead serious | Fun, humorous | Low: Bloomberg / High: Mailchimp |
| **Technical** | ELI5 | Domain jargon | Low: Apple / High: AWS |
| **Emotional** | Data-driven | Feeling-driven | Low: IBM / High: Nike |
| **Provocative** | Play it safe | Bold, controversial | Low: Toyota / High: Liquid Death |

### Language Style
- **Sentence length**: short (punchy), medium, long (narrative), varied
- **Vocabulary**: simple (accessible), professional, technical (industry terms), mixed
- **Perspective**: first-person ("We believe"), third-person ("The company"), mixed
- **Emoji usage**: none, minimal (occasional), moderate, heavy (Gen-Z)

### Voice Attributes
Free-form list of adjectives: e.g., "authoritative", "warm", "witty", "inspiring", "no-nonsense"

### Guardrails
- **Content Dos**: always do these things (e.g., "cite data", "use storytelling")
- **Content Don'ts**: never do these (e.g., "don't use ALL CAPS", "never shame competitors")
- **Banned Words**: specific words to avoid
- **Required Disclosures**: legal/compliance requirements

---

## 13. Content Strategy (Data Model)

Stored as JSONB in `content_strategies.data`, validated by `contentStrategySchema`.

### Full Schema

```typescript
{
  // Content Pillars (what you talk about)
  pillars: [{
    name: string,           // e.g. "Product Education"
    description: string,    // What this pillar covers
    percentage: 0-100,      // % of total content (all pillars sum to 100)
    exampleTopics: string[],// Concrete topic ideas
  }],

  // Platform Schedules (when and where)
  schedule: [{
    platform: "instagram" | "facebook" | "linkedin" | "x" | "gbp",
    postsPerWeek: 1-21,
    preferredDays: string[],    // e.g. ["Monday", "Wednesday", "Friday"]
    preferredTimes: string[],   // e.g. ["09:00", "17:30"]
    contentMix: [{
      type: "image" | "carousel" | "video" | "story" | "text-only" | "thread" | "poll" | "reel",
      percentage: number,       // % of this platform's content
    }],
  }],

  // Weekly Themes (editorial calendar backbone)
  weeklyThemes: [{
    weekNumber: number,
    theme: string,        // e.g. "Customer Success Stories"
    pillar: string,       // Which pillar this week focuses on
    keyMessage: string,   // Core message for the week
  }],

  // Monthly Goals
  monthlyGoals: [{
    metric: string,    // e.g. "followers", "engagement_rate", "website_clicks"
    target: number,
    platform: Platform,
  }],
}
```

### Strategy Lifecycle
- **draft**: AI-generated, user is reviewing
- **active**: Confirmed by user, driving content generation
- **archived**: Superseded by a newer strategy
- Versioned — each new strategy is a new row, not an update

---

## 14. Content Types & Formats

| Type | Platforms | Storage |
|---|---|---|
| **Text post** | All | `caption` field |
| **Image post** | Instagram, Facebook, LinkedIn, GBP | `media_urls` array |
| **Carousel** | Instagram, LinkedIn, Facebook | `carousel_data` JSONB — array of slide objects |
| **Story** | Instagram, Facebook | `media_urls` + story template metadata |
| **Video/Reel** | Instagram, Facebook, LinkedIn | `media_urls` + video script in caption |
| **Thread** | X (Twitter) | `thread_data` JSONB — array of tweet objects |
| **Poll** | X, LinkedIn | Planned for future |
| **Reel/Short** | Instagram | `media_urls` + text overlay data |

### Carousel Data Structure (JSONB)
```json
[
  { "slideNumber": 1, "text": "Hook slide", "imageUrl": "...", "layout": "center-text" },
  { "slideNumber": 2, "text": "Point 1", "imageUrl": "...", "layout": "left-text" },
  { "slideNumber": 3, "text": "CTA slide", "imageUrl": "...", "layout": "cta" }
]
```

### Thread Data Structure (JSONB)
```json
[
  { "position": 1, "text": "🧵 Hook tweet here (1/5)", "mediaUrl": null },
  { "position": 2, "text": "Point 1...", "mediaUrl": "optional-image.jpg" },
  { "position": 5, "text": "TL;DR + CTA", "mediaUrl": null }
]
```

---

## 15. A/B/C Variant Testing

Every piece of content can have up to 3 variants (A, B, C) for testing:

- Variants share the same `variant_group` UUID
- Each variant has a `variant_label` (A, B, or C)
- Variants differ in caption, hashtags, CTA, or media — but target the same pillar/theme
- After publishing, the Analytics Agent compares variant performance
- The Optimizer Agent uses variant results to inform future content strategy
- Only one variant per group gets published (user picks, or AI recommends based on past data)

---

## 16. Approval Workflow

### State Machine

```
                    ┌─────────────────────────────┐
                    │          DRAFT               │
                    │  (Creator writes/edits)      │
                    └──────────┬──────────────────┘
                               │ submit_for_approval
                               ▼
                    ┌─────────────────────────────┐
                    │        IN REVIEW             │
                    │  (Approver reviews)          │
                    └────┬──────────────────┬─────┘
                         │                  │
                    approved        revision-requested
                         │                  │
                         ▼                  ▼
              ┌──────────────────┐  ┌──────────────────┐
              │    APPROVED      │  │ REVISION REQUESTED│
              │                  │  │ (back to creator) │
              └────────┬─────── ┘  └────────┬─────────┘
                       │                     │ revised
                       │                     ▼
                       │            (returns to DRAFT)
                       │ schedule
                       ▼
              ┌──────────────────┐
              │    SCHEDULED     │
              │ (queued to post) │
              └────────┬─────── ┘
                       │ publish
                       ▼
              ┌──────────────────┐
              │    PUBLISHED     │  ← or FAILED
              └──────────────────┘
```

### Audit Trail
Every state transition is logged in `approval_actions` with:
- Which draft was affected
- What action was taken (submitted, approved, revision-requested, revised)
- Notes from the reviewer
- Who performed the action
- Timestamp

---

## 17. Analytics & Metrics

### Metrics Tracked Per Post
| Metric | Type | Description |
|---|---|---|
| `impressions` | integer | Times the post was displayed |
| `reach` | integer | Unique accounts that saw the post |
| `likes` | integer | Like/reaction count |
| `comments` | integer | Comment count |
| `shares` | integer | Share/repost count |
| `saves` | integer | Bookmark/save count |
| `clicks` | integer | Link clicks |
| `engagement_rate` | decimal(5,4) | Calculated engagement % |
| `raw_data` | JSONB | Full platform API response for future analysis |

### Collection Schedule
- First pull: 24 hours after publishing
- Second pull: 48 hours after publishing
- Third pull: 7 days after publishing
- Each pull creates a new `post_analytics` row (time-series)

### Dashboard Views (Phase 8)
- Overview: total followers, engagement rate, post frequency across platforms
- Per-post breakdown: sort by engagement, filter by platform/pillar/date
- A/B variant comparison: side-by-side performance of variant groups
- Trend charts: weekly/monthly performance over time

---

## 18. Optimization & Learning Loop

The Optimizer Agent is the "brain" of the continuous improvement cycle:

### Proposal Types
| Type | What Changes | Example |
|---|---|---|
| `pillar_change` | Content pillar allocation | "Increase 'Customer Stories' from 20% to 35% — engagement is 3x higher" |
| `schedule_change` | Posting times/frequency | "Post on LinkedIn at 7:30 AM instead of 9 AM — 40% more impressions" |
| `tone_change` | Voice/tone adjustments | "Increase playful score from 4 to 6 — casual posts get 2x engagement" |
| `format_change` | Content format mix | "Switch from 60% images to 40% carousels on Instagram — carousels get 5x saves" |

### How It Works
1. Analytics Agent collects sufficient data (e.g., 2+ weeks of posts)
2. Optimizer Agent analyzes trends, identifies patterns
3. Generates proposals with reasoning and evidence
4. User reviews proposals on the `/strategy/optimize` page
5. Approved proposals update the Content Strategy
6. Strategy Agent regenerates calendar with new parameters
7. Loop continues — each cycle has better data to work with

### Semi-Autonomous Design
- AI **proposes**, human **approves** — never auto-changes strategy
- Each proposal shows clear reasoning and expected impact
- Users can reject proposals with feedback (AI learns from rejections too)

---

## 19. Competitor Analysis

### Discovery
- **AI-discovered**: Competitor Agent searches for businesses in the same industry + location
- **Manual**: Users can add competitors by URL/handle
- Both methods are tracked in `competitor_profiles.discovery_method`

### What's Tracked
- Competitor name and platform profiles
- Posting frequency and schedule patterns
- Content types and formats they use
- Engagement rates per post type
- Hashtag strategies
- Top-performing content themes

### How It's Used
- Feeds into the Optimizer Agent for strategy recommendations
- Shown on `/analytics/competitors` dashboard
- "Competitor posted a viral carousel about X — consider similar content?" alerts

---

## 20. Notifications

In-app only (no email/push for MVP):

| Type | Recipient | Trigger |
|---|---|---|
| `draft_ready` | Approvers | Creator submits draft for review |
| `draft_approved` | Creator | Approver approves their draft |
| `revision_requested` | Creator | Approver requests changes |
| `post_published` | Creator + Admin | Publisher Agent successfully posts |
| `post_failed` | Admin | Publisher Agent fails to post |
| `analytics_summary` | All | Weekly analytics digest |
| `optimization_proposal` | Admin + Approver | Optimizer proposes strategy change |
| `competitor_alert` | Admin | Competitor Agent detects notable activity |

Notifications appear in the header bell icon with unread count badge.

---

## 21. Database Schema (Full)

### Enums (12)

```sql
user_role:          admin | creator | approver
platform:           instagram | facebook | linkedin | x | gbp
media_type:         image | carousel | video | story | text-only
draft_status:       draft | in-review | revision-requested | approved | scheduled | published | failed
variant_label:      A | B | C
approval_action:    submitted | approved | revision-requested | revised
strategy_status:    draft | active | archived
proposal_type:      pillar_change | schedule_change | tone_change | format_change
proposal_status:    pending | approved | rejected
discovery_method:   ai-discovered | manual
file_type:          pdf | docx | image
notification_type:  draft_ready | draft_approved | revision_requested | post_published |
                    post_failed | analytics_summary | optimization_proposal | competitor_alert
```

### Tables (15)

#### `tenants`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| name | text | Business name |
| industry | text | Optional |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| email | text | UNIQUE |
| name | text | |
| password_hash | text | Nullable (OAuth users don't have passwords) |
| role | user_role | Default: 'creator' |
| avatar_url | text | |
| email_verified | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `accounts` (Auth.js)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users, CASCADE |
| type | text | |
| provider | text | |
| provider_account_id | text | |
| refresh_token | text | |
| access_token | text | |
| expires_at | integer | |
| token_type | text | |
| scope | text | |
| id_token | text | |
| session_state | text | |

#### `sessions` (Auth.js)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| session_token | text | UNIQUE |
| user_id | uuid | FK → users, CASCADE |
| expires | timestamp | |

#### `verification_tokens` (Auth.js)
| Column | Type | Notes |
|---|---|---|
| identifier | text | |
| token | text | UNIQUE |
| expires | timestamp | |

#### `brand_manifestos`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| data | jsonb | Full BrandManifesto object |
| version | integer | Default: 1 |
| created_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `platform_connections`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| platform | platform | |
| access_token | text | **AES-256-GCM encrypted** |
| refresh_token | text | **AES-256-GCM encrypted** |
| token_expires_at | timestamp | |
| platform_user_id | text | |
| platform_page_id | text | |
| connected_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `content_strategies`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| data | jsonb | Full ContentStrategy object |
| version | integer | Default: 1 |
| status | strategy_status | Default: 'draft' |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `content_drafts`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| strategy_id | uuid | FK → content_strategies (nullable) |
| platform | platform | |
| pillar | text | Which content pillar |
| caption | text | Main post text |
| hashtags | text[] | Array of hashtags |
| cta | text | Call to action |
| media_urls | text[] | Array of media file URLs |
| media_type | media_type | Default: 'text-only' |
| carousel_data | jsonb | Carousel slide array |
| thread_data | jsonb | Thread tweet array |
| variant_group | uuid | Links A/B/C variants |
| variant_label | variant_label | |
| status | draft_status | Default: 'draft' |
| scheduled_at | timestamp | When to publish |
| published_at | timestamp | When actually published |
| platform_post_id | text | ID from platform after publishing |
| created_by | uuid | FK → users |
| reviewed_by | uuid | FK → users |
| approved_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `approval_actions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| draft_id | uuid | FK → content_drafts, CASCADE |
| action | approval_action | |
| notes | text | Reviewer comments |
| acted_by | uuid | FK → users |
| created_at | timestamp | |

#### `post_analytics`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| draft_id | uuid | FK → content_drafts, CASCADE |
| platform | platform | |
| platform_post_id | text | |
| collected_at | timestamp | When metrics were pulled |
| impressions | integer | Default: 0 |
| reach | integer | Default: 0 |
| likes | integer | Default: 0 |
| comments | integer | Default: 0 |
| shares | integer | Default: 0 |
| saves | integer | Default: 0 |
| clicks | integer | Default: 0 |
| engagement_rate | decimal(5,4) | |
| raw_data | jsonb | Full API response |
| created_at | timestamp | |

#### `optimization_proposals`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| proposal_type | proposal_type | |
| title | text | |
| description | text | |
| reasoning | text | AI's justification |
| data | jsonb | Specific proposed changes |
| status | proposal_status | Default: 'pending' |
| proposed_at | timestamp | |
| resolved_at | timestamp | |
| resolved_by | uuid | FK → users |

#### `competitor_profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| name | text | |
| platform | platform | |
| profile_url | text | |
| discovery_method | discovery_method | Default: 'ai-discovered' |
| last_analyzed_at | timestamp | |
| analysis_data | jsonb | Scraped analysis results |
| created_at | timestamp | |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| user_id | uuid | FK → users, CASCADE |
| type | notification_type | |
| title | text | |
| message | text | |
| link | text | URL to navigate to |
| read | boolean | Default: false |
| created_at | timestamp | |

#### `uploaded_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants, CASCADE |
| file_name | text | |
| file_url | text | R2 URL |
| file_type | file_type | |
| processed | boolean | Default: false |
| extracted_data | jsonb | Agent-extracted content |
| uploaded_by | uuid | FK → users |
| created_at | timestamp | |

---

## 22. Authentication System

### Overview
- **Auth.js (next-auth v5 beta)** with JWT strategy
- Session duration: 30 days
- Custom sign-in page: `/login`

### Providers
1. **Credentials**: Email + password (bcryptjs hashed)
2. **Google OAuth**: Auto-creates tenant + user on first sign-in

### JWT Callbacks
- `jwt` callback: fetches `role` and `tenantId` from DB, injects into token
- `session` callback: copies `userId`, `role`, `tenantId` from token to `session.user`
- `signIn` callback: for Google OAuth, auto-creates tenant + user if first time

### Session Type Augmentation
Session `user` object is augmented with:
```typescript
{
  id: string,       // User UUID
  role: string,     // "admin" | "creator" | "approver"
  tenantId: string, // Tenant UUID
}
```

### Registration Flow
1. POST `/api/auth/register` with `{ name, email, password, businessName }`
2. Validates with Zod `registerSchema`
3. Checks for duplicate email
4. Creates tenant (businessName) → creates user (hashed password, role: admin)
5. Returns user data → client auto-signs-in → redirects to `/onboarding`

---

## 23. Security & Encryption

### Platform Token Encryption
- **Algorithm**: AES-256-GCM
- **Key**: 32-byte hex-encoded from `ENCRYPTION_KEY` env var
- **IV**: 16 bytes, randomly generated per encryption
- **Format**: `iv:authTag:encryptedData` (hex-encoded, colon-separated)
- Used for: platform API access tokens, refresh tokens

### Password Security
- **bcryptjs** with default salt rounds
- Null `password_hash` for OAuth-only users

### Session Security
- JWT-based (no database sessions for performance)
- 30-day expiry
- HttpOnly cookies (Auth.js default)

### API Security
- `requireAuth()` — checks session existence, throws "Unauthorized"
- `requirePermission(permission)` — checks session + role-based permission, throws "Forbidden"
- All mutations validate input with Zod schemas

### Data Privacy
- Privacy-first design: no third-party training data sharing
- Clear consent flow planned for data collection
- Tenant isolation: all queries scoped to `tenant_id`

---

## 24. File Storage (Cloudflare R2)

### Configuration
- Uses `@aws-sdk/client-s3` (R2 is S3-compatible)
- Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- Region: `auto`

### Functions
- `uploadFile(key, body, contentType)` → returns public URL
- `deleteFile(key)` → void

### Usage
- Brand assets (logos, brand guideline images)
- AI-generated images
- Carousel slide images
- Uploaded documents (PDFs, DOCX)
- Story template images

---

## 25. Environment Variables

```env
# Database
DATABASE_URL=                    # Neon Postgres connection string (postgresql://...)

# Auth
AUTH_SECRET=                     # Auth.js secret — generate with: openssl rand -base64 32
AUTH_GOOGLE_ID=                  # Google OAuth client ID
AUTH_GOOGLE_SECRET=              # Google OAuth client secret

# Encryption
ENCRYPTION_KEY=                  # 32-byte hex key — generate with: openssl rand -hex 32

# Cloudflare R2
R2_ACCOUNT_ID=                   # Cloudflare account ID
R2_ACCESS_KEY_ID=                # R2 API token access key
R2_SECRET_ACCESS_KEY=            # R2 API token secret key
R2_BUCKET_NAME=                  # R2 bucket name (e.g., "conduit-uploads")
R2_PUBLIC_URL=                   # Public URL prefix for serving files

# AI Models
GEMINI_API_KEY=                  # Google AI Studio API key (free tier)
GROQ_API_KEY=                    # Groq API key (free tier)

# Web Scraping
FIRECRAWL_API_KEY=               # Firecrawl API key
```

---

## 26. Route Map

### Auth Routes (no sidebar)
| Route | Purpose | Phase |
|---|---|---|
| `/login` | Credentials + Google sign-in form | 1 ✅ |
| `/register` | Account + tenant creation form | 1 ✅ |

### Dashboard Routes (with sidebar)
| Route | Purpose | Phase |
|---|---|---|
| `/` | Redirects to `/dashboard` | 1 ✅ |
| `/dashboard` | Overview metrics, getting-started checklist | 1 ✅ |
| `/onboarding` | Brand discovery wizard (URL/PDF/form) | 2 |
| `/brand` | Brand Manifesto viewer/editor | 2 |
| `/brand/voice` | Voice & tone spectrum settings | 2 |
| `/strategy` | Content strategy & pillars editor | 3 |
| `/calendar` | Drag-drop content calendar | 3 |
| `/content/generate` | AI content generation interface | 4 |
| `/content/drafts` | Draft management, editing, preview | 4 |
| `/approval` | Review & approval queue | 6 |
| `/settings` | General workspace settings | 1 ✅ |
| `/settings/team` | Team member management (invite, roles) | 1 ✅ |
| `/settings/platforms` | Platform API connection setup | 7 |
| `/analytics` | Performance dashboard with charts | 8 |
| `/analytics/competitors` | Competitor tracking & analysis | 9 |
| `/strategy/optimize` | AI optimization proposals (accept/reject) | 9 |

### API Routes
| Route | Method | Purpose | Phase |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js handler | 1 ✅ |
| `/api/auth/register` | POST | User registration | 1 ✅ |

---

## 27. File Structure

```
conduit/
├── CONDUIT_BLUEPRINT.md           ← This file (single source of truth)
├── FEATURE_BACKLOG.md             ← Future features beyond Phase 10
├── AGENTS.md                      ← Agent customization rules
├── CLAUDE.md                      ← Points to AGENTS.md
├── .env.example                   ← Environment variable template
├── drizzle.config.ts              ← Drizzle Kit config (schema path, migrations dir)
├── next.config.ts                 ← Next.js configuration
├── package.json                   ← Dependencies & scripts
├── tsconfig.json                  ← TypeScript config
├── postcss.config.mjs             ← PostCSS + Tailwind v4
├── components.json                ← shadcn/ui component config
│
└── src/
    ├── app/
    │   ├── layout.tsx                    # Root layout (fonts, metadata)
    │   ├── page.tsx                      # Redirect to /dashboard
    │   ├── globals.css                   # Tailwind imports + CSS vars
    │   │
    │   ├── (auth)/                       # Auth route group (no sidebar)
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx            # Sign-in form
    │   │   └── register/page.tsx         # Registration form
    │   │
    │   ├── (dashboard)/                  # Dashboard route group (with sidebar)
    │   │   ├── layout.tsx                # SidebarProvider + AppSidebar + header
    │   │   ├── dashboard/page.tsx        # Metric cards + getting-started
    │   │   ├── calendar/page.tsx
    │   │   ├── content/
    │   │   │   ├── drafts/page.tsx
    │   │   │   └── generate/page.tsx
    │   │   ├── approval/page.tsx
    │   │   ├── analytics/
    │   │   │   ├── page.tsx
    │   │   │   └── competitors/page.tsx
    │   │   ├── strategy/
    │   │   │   ├── page.tsx
    │   │   │   └── optimize/page.tsx
    │   │   ├── brand/
    │   │   │   ├── page.tsx
    │   │   │   └── voice/page.tsx
    │   │   ├── settings/
    │   │   │   ├── page.tsx
    │   │   │   ├── team/page.tsx
    │   │   │   └── platforms/page.tsx
    │   │   └── onboarding/page.tsx
    │   │
    │   └── api/
    │       └── auth/
    │           ├── [...nextauth]/route.ts  # Auth.js API handler
    │           └── register/route.ts       # Registration endpoint
    │
    ├── components/
    │   ├── ui/                           # shadcn/ui components
    │   │   ├── avatar.tsx
    │   │   ├── badge.tsx
    │   │   ├── breadcrumb.tsx
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── collapsible.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── separator.tsx
    │   │   ├── sheet.tsx
    │   │   ├── sidebar.tsx
    │   │   ├── skeleton.tsx
    │   │   └── tooltip.tsx
    │   ├── app-sidebar.tsx               # Main sidebar nav (Conduit branding)
    │   ├── nav-main.tsx                  # Navigation items (collapsible + direct)
    │   └── nav-user.tsx                  # User dropdown in sidebar footer
    │
    ├── hooks/
    │   └── use-mobile.tsx                # Mobile detection hook
    │
    └── lib/
        ├── auth/
        │   ├── config.ts                 # NextAuth config (providers, callbacks)
        │   ├── permissions.ts            # Role-based permission system
        │   └── types.d.ts                # Session/JWT type augmentation
        ├── db/
        │   ├── index.ts                  # DB client (lazy Proxy for build compat)
        │   ├── schema.ts                 # All 15 tables + 12 enums
        │   └── migrations/               # Drizzle Kit generated SQL
        ├── storage/
        │   └── r2.ts                     # Cloudflare R2 upload/delete
        ├── constants.ts                  # Platform labels, char/hashtag limits
        ├── encryption.ts                 # AES-256-GCM encrypt/decrypt
        ├── types.ts                      # Zod schemas + TS types
        └── utils.ts                      # cn() class merging utility
```

---

## 28. API Endpoints

### Implemented (Phase 1)

| Method | Endpoint | Auth | Input | Output |
|---|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Public | Auth.js handles | Session/redirect |
| POST | `/api/auth/register` | Public | `{ name, email, password, businessName }` | `{ user }` or `{ error }` |

### Planned (Future Phases)

| Method | Endpoint | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/brand` | ✓ | Get current Brand Manifesto | 2 |
| PUT | `/api/brand` | ✓ + permission | Update Brand Manifesto | 2 |
| POST | `/api/onboarding/scrape` | ✓ | Trigger Scraper Agent | 2 |
| POST | `/api/onboarding/upload` | ✓ | Upload document for analysis | 2 |
| POST | `/api/onboarding/synthesize` | ✓ | Trigger Identity Synthesizer | 2 |
| GET | `/api/strategy` | ✓ | Get current Content Strategy | 3 |
| POST | `/api/strategy/generate` | ✓ | Trigger Strategy Agent | 3 |
| POST | `/api/content/generate` | ✓ | Generate content for platform(s) | 4 |
| GET | `/api/drafts` | ✓ | List drafts (filterable) | 4 |
| GET | `/api/drafts/[id]` | ✓ | Get single draft | 4 |
| PUT | `/api/drafts/[id]` | ✓ | Edit draft | 4 |
| POST | `/api/drafts/[id]/submit` | ✓ | Submit for approval | 6 |
| POST | `/api/drafts/[id]/approve` | ✓ + permission | Approve draft | 6 |
| POST | `/api/drafts/[id]/revise` | ✓ + permission | Request revision | 6 |
| POST | `/api/platforms/connect` | ✓ + permission | Save encrypted platform tokens | 7 |
| GET | `/api/analytics` | ✓ | Dashboard analytics data | 8 |
| GET | `/api/analytics/[draftId]` | ✓ | Per-post analytics | 8 |
| GET | `/api/proposals` | ✓ | List optimization proposals | 9 |
| POST | `/api/proposals/[id]/resolve` | ✓ + permission | Approve/reject proposal | 9 |
| GET | `/api/competitors` | ✓ | List competitor profiles | 9 |

---

## 29. Implementation Phases

### Phase 1 — Foundation ✅ COMPLETE
- [x] Initialize Next.js 16.2.2 + TypeScript + React 19 project
- [x] Set up Tailwind CSS v4 + shadcn/ui v4 with 14 components
- [x] Configure Drizzle ORM + Neon Postgres (client + config)
- [x] Create complete database schema (15 tables, 12 enums)
- [x] Set up Auth.js with Credentials + Google OAuth
- [x] Implement role-based permission system (10 permissions, 3 roles)
- [x] Create JWT callbacks injecting role + tenantId into session
- [x] Set up Cloudflare R2 file storage (upload + delete)
- [x] Implement AES-256-GCM encryption (encrypt + decrypt)
- [x] Create Zod schemas for Brand Manifesto, Content Strategy, auth inputs
- [x] Create platform constants (char limits, hashtag limits, labels)
- [x] Build dashboard layout (sidebar with all nav items + header with notification bell)
- [x] Create login page (email/password + error handling)
- [x] Create register page (name, email, password, business name + auto-sign-in)
- [x] Create root redirect to /dashboard
- [x] Update root layout metadata
- [x] Create all 14 placeholder pages under (dashboard) route group
- [x] Create .env.example with all variables documented
- [x] Verify build compiles cleanly (22 routes, TypeScript passes)
- [ ] Set up Neon database + add DATABASE_URL
- [ ] Run `npx drizzle-kit generate` + `npx drizzle-kit push`
- [ ] Git commit

### Phase 2 — Discovery Pipeline ✅ COMPLETE
- [x] Install LangGraph.js
- [x] Set up LLM client (Gemini API + Groq API)
- [x] Build onboarding wizard UI (multi-step: URL → upload → form → review)
- [x] Implement Scraper Agent (Firecrawl + Jina Reader)
- [x] Implement Document Analyst Agent (PDF/doc parsing)
- [x] Implement Identity Synthesizer Agent (merge all sources → Brand Manifesto)
- [x] Build Brand Manifesto editor page (view + edit JSONB data)
- [x] Build Voice & Tone settings page (tone spectrum sliders, style dropdowns)
- [x] Create API routes: `/api/onboarding/*`, `/api/brand`

### Phase 3 — Strategy & Calendar ✅ COMPLETE
- [x] Implement Strategy Agent (pillars, schedule, themes, calendar generation)
- [x] Build Content Strategy editor page
- [x] Build Calendar page (week view with per-platform schedule; drag-drop deferred to future iteration)
- [x] AI-suggested posting times based on platform best practices
- [x] Create API routes: `/api/strategy/*`

### Phase 4 — Content Generation
- [x] Implement LinkedIn Writer Agent
- [x] Implement Instagram Writer Agent
- [x] Implement Facebook Writer Agent
- [x] Implement X (Twitter) Writer Agent
- [x] Implement GBP Writer Agent
- [x] Build content generation page (select platform, pillar → generate)
- [x] Build draft editor with live preview (per-platform rendering)
- [x] A/B/C variant generation (compare variants side-by-side)
- [x] Hashtag suggestion engine
- [x] Create API routes: `/api/content/generate`, `/api/drafts/*`

### Phase 5 — Visual Content
- [x] Implement Visual Designer Agent
- [x] AI image generation integration (Gemini or external)
- [x] Carousel builder (slide editor, reorder, preview)
- [x] Story template editor
- [x] Image upload to R2 + linking to drafts

### Phase 6 — Approval Workflow ✅
- [x] Build submit-for-review flow (creator → approver)
- [x] Build approval queue page (filterable, sortable)
- [x] Revision request with notes UI
- [x] Audit trail display (timeline of actions per draft)
- [x] Notification triggers on state transitions
- [x] Create API routes: `/api/drafts/[id]/submit|approve|revise`

### Phase 7 — Publishing ✅
- [x] Build platform connection setup page (guided API key entry)
- [x] Encrypt + store platform tokens
- [x] Implement Publisher Agent (post to each platform's API)
- [x] Implement Scheduler Agent (queue management, optimal times)
- [x] Post status tracking (scheduled → published / failed)
- [x] Retry logic for failed posts
- [x] Create API routes: `/api/platforms/*`

### Phase 8 — Analytics
- [x] Implement Analytics Agent (pull metrics from platform APIs)
- [x] Build analytics dashboard with charts (chart library TBD)
- [x] Per-post performance breakdown
- [x] A/B variant comparison view
- [x] Trend charts (weekly/monthly)
- [x] Create API routes: `/api/analytics/*`

### Phase 9 — Optimization & Competitors ✅
- [x] Implement Optimizer Agent (analyze trends → generate proposals)
- [x] Build optimization proposals page (review, approve, reject)
- [x] Implement Competitor Agent (discover + track competitors)
- [x] Build competitor analysis page
- [x] Create API routes: `/api/proposals/*`, `/api/competitors/*`

### Phase 10 — Polish & Launch ✅
- [x] Error handling + edge cases across all flows
- [x] Loading states + skeleton screens
- [x] Mobile responsiveness
- [x] Performance optimization (caching, lazy loading)
- [x] Auth middleware (protect dashboard routes, redirect unauthenticated)
- [x] Documentation
- [ ] Deploy to Vercel + configure production env vars
- [ ] Final QA + testing

---

## 30. Development Notes & Conventions

### Terminal
- PowerShell requires `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` at the start of each terminal session (Windows policy restriction)

### Database Client
- Uses a **lazy Proxy pattern** in `src/lib/db/index.ts` so that `npm run build` works without a `DATABASE_URL` (the actual Neon connection is created on first use, not at import time)

### Zod v4
- Conduit uses Zod v4 (not v3). Key differences:
  - Error property is `.issues` (not `.errors`)
  - Some API changes from v3 — always check Zod v4 docs

### shadcn/ui v4
- Uses `@base-ui/react` (NOT Radix UI)
- Use `render={<Component />}` prop pattern instead of `asChild`
- Install with `npx shadcn@latest add <name>`

### File Naming
- React components: PascalCase (`AppSidebar.tsx` → but shadcn convention is kebab-case `app-sidebar.tsx`)
- Lib files: kebab-case (`encryption.ts`, `r2.ts`)
- Route files: always `page.tsx` in appropriate directory

### Import Aliases
- `@/` maps to `src/` (configured in `tsconfig.json`)

### Code Style
- Prefer server components by default; add `"use client"` only when needed
- Use Zod for all API input validation
- Use `requireAuth()` / `requirePermission()` for all protected endpoints
- Scope all data queries by `tenantId` from session
