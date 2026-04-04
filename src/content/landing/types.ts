export type LandingFeatureIconId =
  | "strategy"
  | "content"
  | "calendar"
  | "approval"
  | "analytics"
  | "brand";

export interface LandingFeature {
  id: string;
  icon: LandingFeatureIconId;
  title: string;
  description: string;
}

export interface LandingCarouselSlide {
  step: string;
  title: string;
  body: string;
}

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingTodayItem {
  title: string;
  description: string;
}

export type TrustChannelId = "linkedin" | "x" | "instagram" | "facebook";

export interface TrustChannel {
  id: TrustChannelId;
  name: string;
}

export interface LandingContent {
  nav: {
    features: string;
    workflow: string;
    whatYouGet: string;
    faq: string;
    logIn: string;
    getStarted: string;
    menuOpen: string;
  };
  hero: {
    title: string;
    titleLine2: string;
    subtitle: string;
    audienceLine: string;
    proofPoint: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  trust: {
    channelsLabel: string;
    channelsDescription: string;
    channels: TrustChannel[];
  };
  today: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: LandingTodayItem[];
  };
  comparison: {
    title: string;
    withLabel: string;
    withConduit: string;
    withoutLabel: string;
    without: string;
  };
  ctaBand: {
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  faq: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: LandingFaqItem[];
  };
  features: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: LandingFeature[];
  };
  carousel: {
    sectionTitle: string;
    sectionSubtitle: string;
    slides: LandingCarouselSlide[];
    prev: string;
    next: string;
    goToSlide: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    privacy: string;
    terms: string;
  };
}
