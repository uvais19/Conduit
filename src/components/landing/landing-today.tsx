import { Check } from "lucide-react";
import type { LandingContent } from "@/content/landing";

export function LandingToday({ section }: { section: LandingContent["today"] }) {
  return (
    <section id="today" className="scroll-mt-20 border-b border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.sectionTitle}</h2>
          <p className="mt-2 text-muted-foreground">{section.sectionSubtitle}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {section.items.map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-xl border border-border/80 bg-card/50 p-4 ring-1 ring-foreground/5"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
