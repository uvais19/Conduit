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

export interface LandingContent {
  nav: {
    features: string;
    workflow: string;
    logIn: string;
    getStarted: string;
    menuOpen: string;
  };
  hero: {
    title: string;
    titleLine2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
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
