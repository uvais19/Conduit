"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/content/landing";
import { HeroStudioBrowser } from "@/components/landing/hero-studio-browser";
import { TrustChannelIcon } from "@/components/landing/trust-channel-icons";

export function LandingHero({ content }: { content: LandingContent }) {
  const reduce = useReducedMotion();
  const { hero, trust } = content;

  const fadeUp = reduce
    ? { initial: false, animate: {} }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="border-b border-border/60" aria-labelledby="hero-heading">
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-background px-5 py-12 sm:px-8 sm:py-16 lg:border-r lg:border-border/60 lg:py-20">
          <div className="mx-auto w-full max-w-xl space-y-5 lg:mx-0">
            <motion.p
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary"
              {...fadeUp}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
              Conduit
            </motion.p>
            <motion.h1
              id="hero-heading"
              className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.title}
              <span className="mt-1 block text-gradient">{hero.titleLine2}</span>
            </motion.h1>
            <motion.p
              className="max-w-xl text-lg leading-relaxed text-foreground/85"
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.subtitle}
            </motion.p>
            <motion.p
              className="max-w-xl text-sm leading-relaxed text-muted-foreground"
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.audienceLine}
            </motion.p>
            <motion.p
              className="max-w-xl rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium leading-relaxed text-foreground"
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.11, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.proofPoint}
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-3 pt-1"
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.13, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 min-w-[9rem] px-6 font-semibold shadow-md glow-primary transition-shadow",
                )}
              >
                {hero.ctaPrimary}
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 min-w-[9rem] border-border/80 bg-transparent font-medium hover:bg-muted/50",
                )}
              >
                {hero.ctaSecondary}
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="relative flex min-h-[20rem] items-center justify-center bg-primary/[0.03] p-6 sm:p-10 lg:min-h-[28rem]"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? {} : { opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <div className="relative z-10 w-full max-w-lg">
            <HeroStudioBrowser />
          </div>
        </motion.div>
      </div>

      <motion.div
        className="border-t border-border/60 bg-muted/30 px-4 py-10 sm:px-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        aria-label={trust.channelsLabel}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground">
            {trust.channelsLabel}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {trust.channelsDescription}
          </p>
        </div>
        <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {trust.channels.map((ch) => (
            <li key={ch.id} className="min-w-0">
              <span className="flex h-full min-h-[3.25rem] items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm transition-shadow hover:shadow-md sm:min-h-0 sm:px-4 sm:py-3">
                <TrustChannelIcon id={ch.id} />
                <span className="min-w-0 text-left text-sm font-semibold tracking-tight text-foreground">
                  {ch.name}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
