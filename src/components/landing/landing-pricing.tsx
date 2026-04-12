import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { LandingContent } from "@/content/landing";

export function LandingPricing({
  section,
}: {
  section: LandingContent["pricing"];
}) {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-b border-border/60 py-16 sm:py-20"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {section.sectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {section.sectionSubtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {section.tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                tier.highlighted
                  ? "border-primary shadow-md ring-1 ring-primary/20"
                  : "border-border/80"
              )}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground">
                    {tier.period}
                  </span>
                )}
              </div>
              <ul className="mb-8 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({
                    variant: tier.highlighted ? "default" : "outline",
                    size: "lg",
                  }),
                  "w-full",
                  tier.highlighted && "shadow-md glow-primary"
                )}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
