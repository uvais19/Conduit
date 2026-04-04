"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const SCENE_MS = 2800;
const TRANSITION = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

const URL_BY_SCENE = [
  "app.conduit.so/strategy",
  "app.conduit.so/content/generate",
  "app.conduit.so/calendar",
  "app.conduit.so/analytics",
] as const;

const LABELS = ["Strategy", "Studio", "Calendar", "Analytics"] as const;

/** Fixed height so scene swaps never change layout; Studio uses fixed thumb rows (no aspect-ratio growth). */
const STAGE_CLASS = "h-[320px] min-h-[320px] max-h-[320px]";

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="mb-3 space-y-2 border-b border-white/10 pb-3">
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-white/40" />
        <span className="size-2 shrink-0 rounded-full bg-white/25" />
        <span className="size-2 shrink-0 rounded-full bg-white/15" />
        <span className="ml-2 text-xs font-medium text-white/60">studio</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
        <span className="size-2.5 shrink-0 rounded-sm bg-emerald-400/80" aria-hidden />
        <span className="truncate font-mono text-[10px] text-white/55">{url}</span>
      </div>
    </div>
  );
}

function StrategyPane() {
  return (
    <div className={`flex ${STAGE_CLASS} flex-col gap-3 overflow-hidden`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Content pillars</p>
      <div className="flex flex-wrap gap-1.5">
        {["Product", "Culture", "Thought leadership"].map((p) => (
          <span
            key={p}
            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85"
          >
            {p}
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Cadence</p>
        <p className="mt-1 text-xs text-white/75">3 posts / week · LinkedIn + X</p>
        <div className="mt-3 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${i < 3 ? "bg-primary/70" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Brand voice</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/70">
          Clear, practical, confident — short paragraphs, strong hooks, no jargon walls.
        </p>
        <div className="mt-3 flex-1 space-y-2">
          <div className="h-2 w-full rounded bg-white/12" />
          <div className="h-2 w-[92%] rounded bg-white/10" />
          <div className="h-2 w-[78%] rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function StudioPane() {
  return (
    <div className={`flex ${STAGE_CLASS} flex-col gap-2 overflow-hidden`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">
          LinkedIn
        </span>
        <span className="text-[10px] text-white/40">Draft</span>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
        <p className="text-[11px] leading-relaxed text-white/75">
          Turning one customer call into a week of posts — here is the framework we use with every team…
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
        <div className="h-[5.25rem] rounded-md bg-gradient-to-br from-white/20 to-white/5" />
        <div className="h-[5.25rem] rounded-md bg-gradient-to-br from-white/12 to-white/5" />
      </div>
      <div className="flex gap-2 pt-0.5">
        <span className="h-7 flex-1 rounded-md bg-primary/45 text-center text-[10px] font-medium leading-7 text-white/95">
          Send for review
        </span>
        <span className="h-7 w-16 rounded-md border border-white/15 bg-white/10 leading-7 text-center text-[10px] text-white/65">
          Edit
        </span>
      </div>
    </div>
  );
}

function CalendarPane() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const scheduled = [1, 3, 5];
  return (
    <div className={`flex ${STAGE_CLASS} flex-col gap-3 overflow-hidden`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">This week</p>
      <div className="grid grid-cols-7 gap-1.5 rounded-lg border border-white/10 bg-black/15 px-2 py-3">
        {days.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center">
            <span className="text-[10px] font-semibold text-white/50">{d}</span>
            <div
              className={`mx-auto mt-2 size-2.5 rounded-full ${
                scheduled.includes(i) ? "bg-emerald-400/90 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" : "bg-white/12"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-2 rounded-lg border border-white/10 bg-black/15 p-3">
        <div className="flex items-start gap-2 text-[11px] leading-snug text-white/70">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-emerald-400/90" />
          <span>Tue 9:00 · Product tip carousel</span>
        </div>
        <div className="flex items-start gap-2 text-[11px] leading-snug text-white/70">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-emerald-400/90" />
          <span>Thu 14:30 · Founder thread</span>
        </div>
        <div className="flex items-start gap-2 text-[11px] leading-snug text-white/50">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-white/15" />
          <span>Sat 11:00 · Weekend engagement (draft)</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPane() {
  return (
    <div className={`flex ${STAGE_CLASS} flex-col gap-3 overflow-hidden`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Last 30 days</p>
      <div className="flex flex-1 flex-col rounded-lg border border-white/10 bg-black/15 px-2 py-3">
        <svg viewBox="0 0 120 48" className="h-[5.5rem] w-full text-white/45" aria-hidden>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="4,40 24,30 44,34 64,14 84,24 104,10 116,18"
          />
        </svg>
        <div className="mt-2 flex justify-between gap-2 border-t border-white/10 pt-2 text-[10px] text-white/45">
          <span>Reach</span>
          <span className="text-white/65">↑ vs prior period</span>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Top post</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">
          “How we doubled reply rates…” — 4.2k impressions
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/55">
          <span>Engage +12%</span>
          <span>CTR 3.1%</span>
          <span>Saves 840</span>
        </div>
      </div>
    </div>
  );
}

function StaticCombinedPane() {
  return (
    <div className={`flex ${STAGE_CLASS} flex-col gap-3 overflow-hidden`}>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="text-[10px] text-white/45">Draft · LinkedIn</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/75">
          Turning one customer call into a week of posts…
        </p>
      </div>
      <div className="grid flex-1 grid-cols-7 gap-1 content-start rounded-lg border border-white/10 bg-black/15 px-2 py-3">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center">
            <span className="text-[10px] font-semibold text-white/50">{d}</span>
            <div
              className={`mx-auto mt-2 size-2.5 rounded-full ${
                [1, 3, 5].includes(i) ? "bg-emerald-400/90" : "bg-white/12"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const panes = [
  <StrategyPane key="strategy" />,
  <StudioPane key="studio" />,
  <CalendarPane key="calendar" />,
  <AnalyticsPane key="analytics" />,
];

export function HeroStudioBrowser() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setScene((s) => (s + 1) % 4);
    }, SCENE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const url = URL_BY_SCENE[reduce ? 1 : scene];
  const showDots = !reduce;

  return (
    <div className="relative flex w-full max-w-md shrink-0 flex-col rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
      <BrowserChrome url={url} />

      <div className={`relative shrink-0 overflow-hidden ${STAGE_CLASS}`}>
        {reduce ? (
          <StaticCombinedPane />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={scene}
              className={STAGE_CLASS}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
            >
              {panes[scene]}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {showDots ? (
        <div className="mt-3 flex h-4 shrink-0 items-center justify-center gap-1.5" role="status" aria-live="polite">
          {LABELS.map((label, i) => (
            <span
              key={label}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === scene ? "w-5 bg-white/70" : "w-1.5 bg-white/25"
              }`}
              title={label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
