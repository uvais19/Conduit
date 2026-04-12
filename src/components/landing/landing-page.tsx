import Link from "next/link";
import type { LandingContent } from "@/content/landing";
import { LandingJsonLd } from "./landing-json-ld";
import { LandingComparison } from "./landing-comparison";
import { LandingCtaBand } from "./landing-cta-band";
import { LandingDemo } from "./landing-demo";
import { LandingFaq } from "./landing-faq";
import { LandingFeatures } from "./landing-features";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingPricing } from "./landing-pricing";
import { LandingSocialProof } from "./landing-social-proof";
import { LandingToday } from "./landing-today";
import { LandingWorkflowCarousel } from "./landing-workflow-carousel";

export function LandingPage({ content }: { content: LandingContent }) {
  const y = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingJsonLd />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <LandingHeader content={content} />
      <main id="main-content" className="flex-1 outline-none" tabIndex={-1} aria-label="Conduit marketing">
        <LandingHero content={content} />
        <LandingSocialProof section={content.socialProof} />
        <LandingFeatures section={content.features} />
        <LandingDemo section={content.demo} />
        <LandingToday section={content.today} />
        <LandingComparison section={content.comparison} />
        <LandingWorkflowCarousel section={content.carousel} />
        <LandingPricing section={content.pricing} />
        <LandingCtaBand section={content.ctaBand} />
        <LandingFaq section={content.faq} />
      </main>
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-medium text-foreground">Conduit</p>
            <p className="mt-1 text-sm text-muted-foreground">{content.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              {content.footer.privacy}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {content.footer.terms}
            </Link>
            <Link href="/login" className="hover:text-foreground">
              {content.nav.logIn}
            </Link>
            <Link href="/register" className="font-medium text-primary hover:underline">
              {content.nav.getStarted}
            </Link>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © {y} {content.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
