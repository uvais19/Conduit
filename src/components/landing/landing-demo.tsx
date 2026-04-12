"use client";

import { Play } from "lucide-react";
import type { LandingContent } from "@/content/landing";

export function LandingDemo({
  section,
}: {
  section: LandingContent["demo"];
}) {
  return (
    <section
      id="demo"
      className="scroll-mt-20 border-b border-border/60 py-16 sm:py-20"
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Demo
          </p>
          <h2
            id="demo-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {section.sectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {section.sectionSubtitle}
          </p>
        </div>

        {/* Video placeholder */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/30 shadow-sm">
          <div className="flex aspect-video flex-col items-center justify-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20">
              <Play className="ml-1 size-7" aria-hidden />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {section.videoPlaceholderText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
