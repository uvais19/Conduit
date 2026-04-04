"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/content/landing";

export function LandingHero({ content }: { content: LandingContent }) {
  const reduce = useReducedMotion();
  const { hero } = content;

  const fadeUp = reduce
    ? { initial: false, animate: {} }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="auth-gradient-mesh noise-overlay landing-hero-mesh relative">
        <div className="orb orb-1 opacity-80" />
        <div className="orb orb-2 opacity-80" />
        <div className="orb orb-3 opacity-80" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
          <div className="flex-1 space-y-5">
            <motion.p
              className="text-sm font-medium tracking-wide text-white/80"
              {...fadeUp}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              Conduit
            </motion.p>
            <motion.h1
              className="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-5xl"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.title}
              <span className="block text-white/90">{hero.titleLine2}</span>
            </motion.h1>
            <motion.p
              className="max-w-xl text-lg leading-relaxed text-white/80"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.subtitle}
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-3"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-10 min-w-[9rem] border-0 bg-white text-zinc-950 shadow-md hover:bg-white/90 hover:text-zinc-950",
                )}
              >
                {hero.ctaPrimary}
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-10 min-w-[9rem] border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white",
                )}
              >
                {hero.ctaSecondary}
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="flex flex-1 justify-center lg:justify-end"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={reduce ? {} : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="size-2 rounded-full bg-white/40" />
                <span className="size-2 rounded-full bg-white/25" />
                <span className="size-2 rounded-full bg-white/15" />
                <span className="ml-2 text-xs font-medium text-white/60">studio</span>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-3/4 rounded bg-white/20" />
                <div className="h-3 w-full rounded bg-white/15" />
                <div className="h-3 w-5/6 rounded bg-white/12" />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-white/25 to-white/5" />
                  <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-white/15 to-white/5" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-8 flex-1 rounded-lg bg-primary/40" />
                  <div className="h-8 w-20 rounded-lg bg-white/20" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
