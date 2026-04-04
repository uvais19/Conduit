import type { LandingContent } from "./types";
import { landingContent } from "./en";

export type {
  LandingContent,
  LandingFeature,
  LandingCarouselSlide,
  LandingFeatureIconId,
} from "./types";

export { landingContent };

export function getLandingContent(): LandingContent {
  return landingContent;
}
