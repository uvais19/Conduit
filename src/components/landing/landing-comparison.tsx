import { ArrowRight, Layers, LayoutGrid } from "lucide-react";
import type { LandingContent } from "@/content/landing";

export function LandingComparison({ section }: { section: LandingContent["comparison"] }) {
  return (
    <section className="border-b border-border/60 bg-muted/15 py-12 sm:py-14" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="comparison-heading" className="sr-only">
          {section.title}
        </h2>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Layers className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.withLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{section.withConduit}</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/80 bg-card p-4 sm:p-5 ring-1 ring-foreground/5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.withoutLabel}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.without}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          Same work, fewer handoffs
        </p>
      </div>
    </section>
  );
}
