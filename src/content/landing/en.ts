import type { LandingContent } from "./types";

export const landingContent: LandingContent = {
  nav: {
    features: "Features",
    workflow: "How it works",
    logIn: "Log in",
    getStarted: "Get started",
    menuOpen: "Open menu",
  },
  hero: {
    title: "AI social media",
    titleLine2: "from strategy to publish",
    subtitle:
      "Plan, create, approve, and schedule in one place — so you can ship consistent content without living in five tabs.",
    ctaPrimary: "Get started free",
    ctaSecondary: "Log in",
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
};
