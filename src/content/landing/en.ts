import type { LandingContent } from "./types";

export const landingContent: LandingContent = {
  nav: {
    features: "Features",
    workflow: "How it works",
    whatYouGet: "What you get",
    faq: "FAQ",
    logIn: "Log in",
    getStarted: "Get started",
    menuOpen: "Open menu",
  },
  hero: {
    title: "AI social media",
    titleLine2: "from strategy to publish",
    subtitle:
      "Plan, create, approve, and schedule in one place — so you can ship consistent content without living in five tabs.",
    audienceLine:
      "Built for marketing teams, founders, and agencies who need one source of truth from strategy to scheduled posts.",
    proofPoint:
      "Approvals, brand context, and calendars live together — so nothing goes live by accident.",
    ctaPrimary: "Get started free",
    ctaSecondary: "Log in",
  },
  trust: {
    channelsLabel: "Plan and publish across channels",
    channelsDescription:
      "One approval path and calendar for the networks your team already runs — brand context travels with every post.",
    channels: [
      { id: "linkedin", name: "LinkedIn" },
      { id: "x", name: "X" },
      { id: "instagram", name: "Instagram" },
      { id: "facebook", name: "Facebook" },
    ],
  },
  today: {
    sectionTitle: "What you get in Conduit today",
    sectionSubtitle:
      "A single product flow — not a patchwork of docs, DMs, and disconnected schedulers.",
    items: [
      {
        title: "Strategy & brand context",
        description:
          "Pillars, cadence, and voice in one place so drafts stay aligned with what you promised to ship.",
      },
      {
        title: "AI content studio & drafts",
        description:
          "Generate and refine posts with your brand in mind, attach media, and iterate before anyone approves.",
      },
      {
        title: "Calendar & scheduling",
        description:
          "See what ships when, adjust timing, and keep channels coordinated from one schedule.",
      },
      {
        title: "Approval workflows",
        description:
          "Reviewers comment and sign off so stakeholders stay in the loop without endless threads.",
      },
      {
        title: "Analytics & insights",
        description:
          "Track what resonates, learn from top posts, and feed the next cycle with real performance data.",
      },
    ],
  },
  comparison: {
    title: "Why teams switch",
    withLabel: "With Conduit",
    withConduit: "One conduit — strategy, drafts, approvals, calendar, and analytics together.",
    withoutLabel: "Typical stack",
    without: "Five tabs — strategy in docs, copy in chat, approvals in email, scheduling elsewhere.",
  },
  ctaBand: {
    title: "Ship consistent social without the tab shuffle",
    subtitle:
      "Create your workspace, connect channels, and run the same rhythm your hero preview just showed — end to end.",
    ctaPrimary: "Get started free",
    ctaSecondary: "Log in",
  },
  faq: {
    sectionTitle: "Questions, answered",
    sectionSubtitle: "Straightforward detail for teams evaluating Conduit.",
    items: [
      {
        question: "How does Conduit use my brand and content with AI?",
        answer:
          "You add strategy notes, voice guidelines, and files in the product. The studio uses that context to draft and refine posts. You control what gets sent for review or scheduled — AI suggestions are not auto-published.",
      },
      {
        question: "What does approval look like in practice?",
        answer:
          "Drafts move through a review step: teammates can leave feedback, request changes, and explicitly approve before anything hits the calendar or goes live. That keeps legal, founders, or clients in the loop without separate email chains.",
      },
      {
        question: "Which social platforms can I connect?",
        answer:
          "Conduit is built around the major networks teams use for B2B and brand marketing — including LinkedIn, X, Instagram, and Facebook. Connect the accounts you need and manage timing from one calendar.",
      },
      {
        question: "Is my data used to train public AI models?",
        answer:
          "We do not use your content to train public models unless we run a separate, clearly disclosed program with your consent. See our Privacy Policy for how AI providers process prompts and how we handle retention.",
      },
      {
        question: "Do you offer a free tier?",
        answer:
          "You can get started free to explore the workflow. Paid plans typically add seats, higher limits, or advanced features as your team scales — check in-product billing or contact us for current options.",
      },
      {
        question: "Can I manage multiple brands from one account?",
        answer:
          "Yes. Each brand gets its own workspace with separate strategy, voice guidelines, and connected platforms. Switch between workspaces to manage different clients or product lines — perfect for agencies.",
      },
      {
        question: "How does the AI content studio handle different platforms?",
        answer:
          "When generating content, the studio adapts output for each platform's format and character limits. A LinkedIn thought-leadership post reads differently from an Instagram caption — the AI uses your brand context plus platform best practices to tailor each draft.",
      },
      {
        question: "Can I schedule content across multiple time zones?",
        answer:
          "Absolutely. Set your workspace's default timezone in settings, and the calendar displays everything in your local time. When you schedule posts, times are converted to each platform's native timezone automatically.",
      },
      {
        question: "What happens if a platform API goes down during publishing?",
        answer:
          "Conduit retries failed publishes automatically with exponential backoff. If publishing still fails after retries, the post is flagged in your dashboard with a clear error so you can re-queue or publish manually.",
      },
      {
        question: "Do you support video and carousel content?",
        answer:
          "You can attach images and video to drafts. The media gallery supports common formats, and the preview shows how carousels and video posts will render on each platform before you publish.",
      },
      {
        question: "How does Conduit compare to Buffer, Hootsuite, or Sprout Social?",
        answer:
          "Most schedulers bolt on strategy as an afterthought. Conduit starts with strategy and brand context, so every draft is grounded in your positioning — not just queued in a time slot. Approvals, analytics, and AI generation all live in the same workflow instead of separate add-ons.",
      },
    ],
  },
  features: {
    sectionTitle: "Everything in one conduit",
    sectionSubtitle:
      "Grounded in how Conduit actually works today — not a generic marketing checklist.",
    items: [
      {
        id: "strategy",
        icon: "strategy",
        title: "Strategy that stays on-brand",
        description:
          "Turn goals and positioning into a living plan your whole team can follow.",
      },
      {
        id: "content",
        icon: "content",
        title: "Drafts & AI content studio",
        description:
          "Generate and refine posts with context from your brand — then iterate fast.",
      },
      {
        id: "calendar",
        icon: "calendar",
        title: "Calendar & scheduling",
        description:
          "See what ships when, adjust timing, and keep channels aligned.",
      },
      {
        id: "approval",
        icon: "approval",
        title: "Approval workflows",
        description:
          "Review, comment, and sign off so nothing goes live by accident.",
      },
      {
        id: "analytics",
        icon: "analytics",
        title: "Analytics & insights",
        description:
          "Track performance and learn what resonates across platforms.",
      },
      {
        id: "brand",
        icon: "brand",
        title: "Brand voice",
        description:
          "Keep tone and messaging consistent as you scale output.",
      },
    ],
  },
  carousel: {
    sectionTitle: "How teams use Conduit",
    sectionSubtitle:
      "From first login to scheduled posts — here is the rhythm teams run in Conduit.",
    slides: [
      {
        step: "01",
        title: "Connect & onboard",
        body: "Link social accounts, upload brand docs, and describe your business so strategy and AI outputs reflect how you actually sound — not a generic template.",
      },
      {
        step: "02",
        title: "Shape the strategy",
        body: "Define pillars, posting cadence, and goals in one place. Everyone sees the same plan, so drafts stay aligned with what you promised to publish.",
      },
      {
        step: "03",
        title: "Create & collaborate",
        body: "Use the content studio to draft and refine copy, attach media, and send work through approval — reviewers leave feedback before anything goes live.",
      },
      {
        step: "04",
        title: "Schedule & learn",
        body: "Drop approved posts on the calendar, ship on time, then read analytics to see what landed. Double down on winners and adjust the next cycle with data.",
      },
    ],
    prev: "Previous slide",
    next: "Next slide",
    goToSlide: "Go to slide",
  },
  footer: {
    tagline: "Strategy to publishing, on autopilot.",
    copyright: "Conduit. All rights reserved.",
    privacy: "Privacy",
    terms: "Terms",
  },
  pricing: {
    sectionTitle: "Simple, transparent pricing",
    sectionSubtitle:
      "Start free, upgrade when your team grows. No surprise fees, no per-post charges.",
    tiers: [
      {
        name: "Starter",
        price: "Free",
        period: "",
        description: "For solo creators and small brands getting started.",
        features: [
          "1 workspace",
          "2 connected platforms",
          "50 AI-generated drafts/month",
          "Basic analytics",
          "Calendar & scheduling",
          "Community support",
        ],
        cta: "Get started free",
      },
      {
        name: "Pro",
        price: "$29",
        period: "/month",
        description: "For growing teams who need approval workflows and deeper insights.",
        features: [
          "Unlimited workspaces",
          "5 connected platforms",
          "Unlimited AI drafts",
          "Advanced analytics & export",
          "Approval workflows",
          "Brand consistency checker",
          "Content templates",
          "Priority support",
        ],
        cta: "Start 14-day trial",
        highlighted: true,
      },
      {
        name: "Agency",
        price: "$79",
        period: "/month",
        description: "For agencies managing multiple brands and client accounts.",
        features: [
          "Everything in Pro",
          "Unlimited team members",
          "Multi-brand management",
          "Client approval portal",
          "Custom brand voices",
          "API access",
          "Dedicated support",
          "White-label reports",
        ],
        cta: "Contact sales",
      },
    ],
  },
  socialProof: {
    sectionTitle: "Trusted by marketing teams",
    stats: [
      { value: "10,000+", label: "Posts scheduled" },
      { value: "500+", label: "Brands onboarded" },
      { value: "3.2x", label: "Faster content cycle" },
      { value: "40%", label: "Higher engagement" },
    ],
    testimonials: [
      {
        quote:
          "Conduit replaced our spreadsheet-based content calendar and three other tools. Our approval time went from days to hours.",
        author: "Sarah Chen",
        role: "Head of Marketing, Bloom Agency",
      },
      {
        quote:
          "The AI content studio actually understands our brand voice. We went from 3 posts/week to daily publishing without sacrificing quality.",
        author: "Marcus Rivera",
        role: "Founder, GrowthLab",
      },
      {
        quote:
          "Finally, a tool where strategy and execution live in the same place. No more copy-pasting between docs and schedulers.",
        author: "Priya Sharma",
        role: "Social Media Manager, TechVault",
      },
    ],
  },
  demo: {
    sectionTitle: "See Conduit in action",
    sectionSubtitle:
      "Watch how teams go from strategy to scheduled posts in minutes — not hours.",
    videoPlaceholderText: "Product demo coming soon",
  },
};
