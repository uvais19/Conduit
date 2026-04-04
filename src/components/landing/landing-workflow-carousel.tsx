"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/content/landing";

type Section = LandingContent["carousel"];

export function LandingWorkflowCarousel({ section }: { section: Section }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slides = section.slides;
  const len = slides.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % len);
  }, [len]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + len) % len);
  }, [len]);

  useEffect(() => {
    if (reduce || len < 2) {
      return;
    }
    const t = setInterval(next, 6200);
    return () => clearInterval(t);
  }, [reduce, len, next]);

  const slide = slides[index]!;

  return (
    <section
      id="workflow"
      className="scroll-mt-20 border-b border-border/60 bg-muted/20 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {section.sectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">{section.sectionSubtitle}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-foreground/5 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={prev}
              aria-label={section.prev}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-h-[11rem] flex-1 px-2 text-center sm:min-h-[9rem] sm:px-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={slide.step}
                  initial={reduce ? false : { opacity: 0, x: 28 }}
                  animate={reduce ? {} : { opacity: 1, x: 0 }}
                  exit={reduce ? {} : { opacity: 0, x: -28 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-xs font-semibold tracking-widest text-primary">{slide.step}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    {slide.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{slide.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={next}
              aria-label={section.next}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setIndex(i)}
                className={
                  i === index
                    ? "size-2.5 rounded-full bg-primary transition-colors"
                    : "size-2.5 rounded-full bg-muted-foreground/25 transition-colors hover:bg-muted-foreground/45"
                }
                aria-label={`${section.goToSlide} ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}