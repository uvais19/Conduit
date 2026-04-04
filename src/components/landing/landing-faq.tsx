import { ChevronDown } from "lucide-react";
import type { LandingContent } from "@/content/landing";

export function LandingFaq({ section }: { section: LandingContent["faq"] }) {
  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 text-center sm:text-left">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {section.sectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">{section.sectionSubtitle}</p>
        </div>
        <div className="divide-y divide-border/80 border-y border-border/80">
          {section.items.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
