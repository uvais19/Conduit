import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Conduit",
  description:
    "How Conduit collects, uses, and protects your information when you use our AI social media management product.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Conduit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: April 4, 2026. This policy describes how Conduit (&quot;we&quot;,
            &quot;us&quot;) handles personal information when you use our website and services.
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">1. Who this applies to</h2>
          <p>
            This policy applies to visitors of our marketing site, registered users, and anyone who
            uses Conduit to plan, create, review, or schedule social content. If you use Conduit on
            behalf of a company, that organization may have its own policies that also apply.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">2. Information we collect</h2>
          <p>We collect information in these main categories:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>
              <strong className="text-foreground">Account and profile.</strong> When you sign up or
              sign in (for example through our authentication provider), we receive identifiers such
              as your email address, name, and profile image if you choose to provide them.
            </li>
            <li>
              <strong className="text-foreground">Content and files you add.</strong> Text, drafts,
              strategy notes, brand documents, images, and other materials you upload or generate in
              the product are stored so we can provide editing, approval, scheduling, and related
              features.
            </li>
            <li>
              <strong className="text-foreground">Connected platforms.</strong> If you connect social
              accounts, we receive tokens and profile or page identifiers needed to publish or read
              analytics, as permitted by those platforms and your settings.
            </li>
            <li>
              <strong className="text-foreground">Usage and technical data.</strong> We collect
              diagnostics such as IP address, device and browser type, approximate location derived
              from IP, timestamps, and in-product events (for example errors and feature usage) to
              operate, secure, and improve the service.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">3. How we use information</h2>
          <p>We use the data above to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Provide, maintain, and improve Conduit, including AI-assisted drafting and suggestions;</li>
            <li>Authenticate users, prevent abuse, and protect security;</li>
            <li>Communicate about the service, billing (if applicable), and important notices;</li>
            <li>Comply with law and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">4. Artificial intelligence</h2>
          <p>
            Certain features send your prompts, brand context, and related content to third-party AI
            model providers to generate or transform text and media. Those providers process inputs
            only as needed to return results to you, subject to their own terms and safeguards. We
            do not use your content to train public models unless we clearly disclose a separate
            program and obtain appropriate consent.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">5. Sharing and subprocessors</h2>
          <p>
            We share information with vendors that help us run Conduit, such as cloud hosting,
            database providers, authentication services, analytics for reliability, and AI
            infrastructure. They may only use data to perform services for us and are bound by
            contractual obligations. We may also disclose information if required by law or to
            protect rights and safety.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">6. Retention</h2>
          <p>
            We keep information for as long as your account is active or as needed to provide the
            service. You may delete certain content in the product; we may retain backups for a
            limited period for recovery and legal compliance. When data is no longer required, we
            delete or anonymize it in line with our retention practices.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
          <p>
            We use industry-standard technical and organizational measures designed to protect data
            in transit and at rest. No method of transmission or storage is completely secure; we
            encourage strong passwords and safe handling of integration credentials.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">8. Your choices and rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete, or export
            personal data, or to object to or restrict certain processing. You can manage much of
            this through your account settings or by contacting us. You may also revoke connected
            social accounts at any time through the product or the platform itself.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">9. Children</h2>
          <p>
            Conduit is not directed at children under 13 (or the minimum age in your jurisdiction).
            We do not knowingly collect personal information from children. If you believe we have,
            please contact us so we can delete it.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">10. International transfers</h2>
          <p>
            We may process and store information in countries other than where you live. Where
            required, we use appropriate safeguards (such as standard contractual clauses) for
            cross-border transfers.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">11. Changes</h2>
          <p>
            We may update this policy from time to time. We will post the revised version on this
            page and adjust the &quot;Last updated&quot; date. Material changes may be communicated
            through the product or by email where appropriate.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
          <p>
            For privacy questions or requests, contact the team operating your Conduit deployment at
            the support email or address they provide. If you use a self-hosted or white-label
            instance, the organization running that instance is typically the data controller for
            your account data.
          </p>
        </section>
      </main>
    </div>
  );
}
