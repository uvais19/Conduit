"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";
import type { LandingContent } from "@/content/landing";

export function LandingSocialProof({
  section,
}: {
  section: LandingContent["socialProof"];
}) {
  const reduce = useReducedMotion();

  return (
    <section
      className="border-b border-border/60 bg-muted/20 py-16 sm:py-20"
      aria-labelledby="social-proof-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p
          id="social-proof-heading"
          className="mb-10 text-center text-xs font-semibold uppercase tracking-wider text-primary"
        >
          {section.sectionTitle}
        </p>

        {/* Stats row */}
        <div className="mb-14 grid grid-cols-2 gap-6 md:grid-cols-4">
          {section.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <p className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid gap-6 md:grid-cols-3">
          {section.testimonials.map((t, i) => (
            <motion.blockquote
              key={t.author}
              className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={reduce ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Quote
                className="mb-3 size-5 text-primary/40"
                aria-hidden
              />
              <p className="flex-1 text-sm leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-4 border-t border-border/60 pt-3">
                <p className="text-sm font-medium text-foreground">
                  {t.author}
                </p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
