import type { LandingContent } from "./types";
import { landingContent } from "./en";

export type {
  LandingContent,
  LandingFeature,
  LandingCarouselSlide,
  LandingFeatureIconId,
  LandingFaqItem,
  LandingTodayItem,
  LandingPricingTier,
  LandingSocialProofStat,
  LandingTestimonial,
  TrustChannel,
  TrustChannelId,
} from "./types";

export { landingContent };

export function getLandingContent(): LandingContent {
  return landingContent;
}
