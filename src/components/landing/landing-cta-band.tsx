"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/content/landing";

export function LandingCtaBand({ section }: { section: LandingContent["ctaBand"] }) {
  return (
    <section className="border-b border-border/60 bg-muted/25 py-14 sm:py-16" aria-labelledby="cta-band-heading">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 id="cta-band-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {section.title}
        </h2>
        <p className="mt-3 text-muted-foreground">{section.subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "min-w-[10rem]")}>
            {section.ctaPrimary}
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-[10rem]")}
          >
            {section.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
