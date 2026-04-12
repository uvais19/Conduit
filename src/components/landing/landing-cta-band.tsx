"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/content/landing";

export function LandingCtaBand({ section }: { section: LandingContent["ctaBand"] }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 py-16 sm:py-20" aria-labelledby="cta-band-heading">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-primary/5" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 id="cta-band-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {section.title}
        </h2>
        <p className="mt-3 text-muted-foreground">{section.subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "min-w-[10rem] shadow-md glow-primary")}>
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
