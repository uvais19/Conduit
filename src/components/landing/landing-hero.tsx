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
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="relative overflow-hidden border-b border-border/60" aria-labelledby="hero-heading">
      <div className="auth-gradient-mesh noise-overlay landing-hero-mesh relative">
        <div className="orb orb-1 opacity-80" />
        <div className="orb orb-2 opacity-80" />
        <div className="orb orb-3 opacity-80" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-14 lg:pb-16 lg:pt-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            <div className="min-w-0 flex-1 space-y-5">
              <motion.p
                className="text-sm font-medium tracking-wide text-white/80"
                {...fadeUp}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                Conduit
              </motion.p>
              <motion.h1
                id="hero-heading"
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
              <motion.p
                className="max-w-xl text-sm leading-relaxed text-white/70"
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.11, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero.audienceLine}
              </motion.p>
              <motion.p
                className="max-w-xl text-sm font-medium leading-relaxed text-white/85"
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero.proofPoint}
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
              className="flex w-full shrink-0 justify-center self-start lg:flex-1 lg:w-auto lg:justify-end"
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={reduce ? {} : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroStudioBrowser />
            </motion.div>
          </div>

          <motion.div
            className="mt-10 border-t border-white/10 pt-8 lg:mt-12"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            aria-label={trust.channelsLabel}
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold tracking-tight text-white sm:text-base">
                {trust.channelsLabel}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                {trust.channelsDescription}
              </p>
            </div>
            <ul className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-3 sm:max-w-4xl md:grid-cols-4 md:gap-4">
              {trust.channels.map((ch) => (
                <li key={ch.id} className="min-w-0">
                  <span className="flex h-full min-h-[3.25rem] items-center gap-3 rounded-2xl border border-white/15 bg-gradient-to-b from-white/14 to-white/[0.06] px-3 py-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md sm:min-h-0 sm:px-4 sm:py-3.5">
                    <TrustChannelIcon id={ch.id} />
                    <span className="min-w-0 text-left text-sm font-medium tracking-tight text-white/95">
                      {ch.name}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
