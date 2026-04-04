import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Conduit",
  description:
    "Terms governing use of the Conduit website and AI social media management services.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            ← Back to Conduit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: April 4, 2026. These terms govern access to and use of Conduit&apos;s
            website and services. By creating an account or using the product, you agree to them.
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">1. The service</h2>
          <p>
            Conduit provides tools for social media strategy, AI-assisted content creation,
            collaboration, approvals, scheduling, and analytics. Features may change as we improve
            the product. We aim for high availability but do not guarantee uninterrupted access.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">2. Accounts and acceptable use</h2>
          <p>
            You are responsible for account security and for activity under your credentials. You
            may not misuse the service — including attempting unauthorized access, overloading
            systems, scraping in violation of our policies, or using Conduit to distribute unlawful
            or harmful content. We may suspend or terminate accounts that violate these terms or
            put the platform or other users at risk.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">3. Your content</h2>
          <p>
            You retain rights to content you provide. You grant Conduit a license to host, process,
            display, and transmit that content solely to operate and improve the service for you —
            for example, to generate drafts, run approvals, publish to connected platforms, and
            show analytics. You represent that you have the rights needed to upload or connect the
            materials you use with Conduit.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">4. AI-generated output</h2>
          <p>
            AI features produce suggestions that may be inaccurate or inappropriate for your context.
            You are responsible for reviewing output before publication. Conduit does not warrant
            that AI-generated content is error-free or suitable for any particular purpose.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">5. Third-party platforms</h2>
          <p>
            When you connect social networks or other services, their terms and policies also
            apply. Conduit is not responsible for third-party outages, API changes, or enforcement
            actions on those platforms.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">6. Disclaimers and limitation of liability</h2>
          <p>
            The service is provided &quot;as is&quot; to the fullest extent permitted by law. Conduit
            disclaims implied warranties where allowed. Our total liability for claims arising from
            these terms or the service is limited to the greater of amounts you paid us in the
            twelve months before the claim or one hundred dollars (USD), except where liability
            cannot be limited by law.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">7. Changes</h2>
          <p>
            We may update these terms. We will post the revised version on this page and update the
            &quot;Last updated&quot; date. Continued use after changes constitutes acceptance of the
            revised terms where permitted by law.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
          <p>
            For questions about these terms, contact the team operating your Conduit deployment. If
            you use a managed or white-label instance, the organization providing that instance may
            be your contracting party.
          </p>
        </section>
      </main>
    </div>
  );
}
