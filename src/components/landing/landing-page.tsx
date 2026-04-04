import Link from "next/link";
import type { LandingContent } from "@/content/landing";
import { LandingFeatures } from "./landing-features";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingWorkflowCarousel } from "./landing-workflow-carousel";

export function LandingPage({ content }: { content: LandingContent }) {
  const y = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader content={content} />
      <main className="flex-1">
        <LandingHero content={content} />
        <LandingFeatures section={content.features} />
        <LandingWorkflowCarousel section={content.carousel} />
      </main>
      <footer className="border-t border-border/60 bg-muted/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-medium text-foreground">Conduit</p>
            <p className="mt-1 text-sm text-muted-foreground">{content.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              {content.footer.privacy}
            </Link>
            <span>{content.footer.terms}</span>
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
