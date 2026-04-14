"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  position?: "center" | "bottom-right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Conduit!",
    description:
      "Let's take a quick tour. Conduit helps you go from brand strategy to published social media posts — all in one place.",
    targetSelector: '[data-tour-id="nav-overview"]',
    position: "center",
  },
  {
    title: "Overview dashboard",
    description:
      "This is your command center for performance snapshots, tasks, and quick actions across the workspace.",
    targetSelector: '[data-tour-id="nav-overview"]',
  },
  {
    title: "Content workspace",
    description:
      "Use Content to generate drafts, manage templates, and recycle high-performing ideas.",
    targetSelector: '[data-tour-id="nav-content"]',
  },
  {
    title: "Approvals pipeline",
    description:
      "Approvals keeps review, comments, and publishing decisions organized before anything goes live.",
    targetSelector: '[data-tour-id="nav-approvals"]',
  },
  {
    title: "Calendar planner",
    description:
      "Calendar gives you the posting timeline with drag-and-drop scheduling and conflict visibility.",
    targetSelector: '[data-tour-id="nav-calendar"]',
  },
  {
    title: "Insights and analytics",
    description:
      "Insights covers analytics, post analysis, and competitor tracking to improve future content.",
    targetSelector: '[data-tour-id="nav-insights"]',
  },
  {
    title: "Strategy and brand",
    description:
      "Strategy and Brand sections keep your plan, voice, and creative direction aligned as you scale.",
    targetSelector:
      '[data-tour-id="nav-strategy"], [data-tour-id="nav-brand"]',
  },
  {
    title: "You're all set!",
    description:
      "Start by onboarding your business — everything else flows from there. You can revisit this tour anytime from settings.",
    targetSelector: '[data-tour-id="nav-workspace"]',
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "conduit-tour-completed";

export function GuidedTour() {
  const pathname = usePathname();
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed && pathname === "/dashboard") {
        setStep(0);
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, [pathname]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setStep(-1);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  const goNext = useCallback(() => {
    const next = step + 1;
    if (next >= TOUR_STEPS.length) {
      dismiss();
      return;
    }
    setStep(next);
  }, [step, dismiss]);

  const goPrev = useCallback(() => {
    const prev = step - 1;
    if (prev < 0) return;
    setStep(prev);
  }, [step]);

  const targetElement = useMemo(() => {
    if (typeof document === "undefined") return null;
    const current = TOUR_STEPS[step];
    if (!current?.targetSelector) return null;
    const selectors = current.targetSelector.split(",").map((s) => s.trim());
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) return found;
    }
    return null;
  }, [step]);

  useEffect(() => {
    if (!visible || step < 0) return;
    if (!targetElement) {
      setHighlightRect(null);
      return;
    }
    const updateRect = () => {
      setHighlightRect(targetElement.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [visible, step, targetElement]);

  useEffect(() => {
    if (!visible) return;
    const onCaptureClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-tour-dialog='true']")) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onCaptureClick, true);
    return () => {
      document.removeEventListener("click", onCaptureClick, true);
    };
  }, [visible]);

  if (!visible || step < 0) return null;

  const current = TOUR_STEPS[step];
  if (!current) return null;
  const isCenter = current.position === "center";
  const isLast = step === TOUR_STEPS.length - 1;
  const pad = 8;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const hole = highlightRect && step > 0
    ? {
        top: Math.max(0, highlightRect.top - pad),
        left: Math.max(0, highlightRect.left - pad),
        right: Math.min(viewportW, highlightRect.right + pad),
        bottom: Math.min(viewportH, highlightRect.bottom + pad),
      }
    : null;

  return (
    <>
      {hole ? (
        <>
          <div
            className="fixed z-[100] bg-black/40 backdrop-blur-sm"
            style={{ top: 0, left: 0, right: 0, height: hole.top }}
            onClick={dismiss}
            aria-hidden
          />
          <div
            className="fixed z-[100] bg-black/40 backdrop-blur-sm"
            style={{
              top: hole.top,
              left: 0,
              width: hole.left,
              height: Math.max(0, hole.bottom - hole.top),
            }}
            onClick={dismiss}
            aria-hidden
          />
          <div
            className="fixed z-[100] bg-black/40 backdrop-blur-sm"
            style={{
              top: hole.top,
              right: 0,
              width: Math.max(0, viewportW - hole.right),
              height: Math.max(0, hole.bottom - hole.top),
            }}
            onClick={dismiss}
            aria-hidden
          />
          <div
            className="fixed z-[100] bg-black/40 backdrop-blur-sm"
            style={{ left: 0, right: 0, bottom: 0, top: hole.bottom }}
            onClick={dismiss}
            aria-hidden
          />
          <div
            className="fixed z-[100]"
            style={{
              top: hole.top,
              left: hole.left,
              width: Math.max(0, hole.right - hole.left),
              height: Math.max(0, hole.bottom - hole.top),
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-hidden
          />
        </>
      ) : (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
          aria-hidden
        />
      )}
      {highlightRect && step > 0 ? (
        <div
          className="pointer-events-none fixed z-[100] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
          aria-hidden
        />
      ) : null}
      {/* Tour card */}
      <div
        data-tour-dialog="true"
        className={`fixed z-[101] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-5 shadow-2xl ${
          isCenter
            ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            : "bottom-6 right-6"
        }`}
        role="dialog"
        aria-label="Guided tour"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {step + 1} of {TOUR_STEPS.length}
            </p>
            <h3 className="mt-1 text-base font-semibold">{current.title}</h3>
          </div>
          <button
            onClick={dismiss}
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Close tour"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {current.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={goPrev}>
                <ArrowLeft className="mr-1 size-3.5" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={goNext}>
              {isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight className="ml-1 size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TourResetButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(TOUR_STORAGE_KEY);
          window.location.href = "/dashboard";
        } catch {
          // ignore
        }
      }}
      className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
    >
      Restart guided tour
    </button>
  );
}
