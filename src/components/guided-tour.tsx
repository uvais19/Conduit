"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  targetRoute: string;
  position?: "center" | "bottom-right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Conduit!",
    description:
      "Let's take a quick tour. Conduit helps you go from brand strategy to published social media posts — all in one place.",
    targetRoute: "/dashboard",
    position: "center",
  },
  {
    title: "Start with onboarding",
    description:
      "Enter your business details and website. Our AI agents will analyze your brand and generate a Brand Manifesto automatically.",
    targetRoute: "/onboarding",
  },
  {
    title: "Build your strategy",
    description:
      "Define content pillars, posting cadence, and goals. The AI uses your manifesto to create a strategy tailored to your brand.",
    targetRoute: "/strategy",
  },
  {
    title: "Create content",
    description:
      "Generate platform-native posts with the AI content studio. Refine, attach media, and send for approval — all from one editor.",
    targetRoute: "/content/generate",
  },
  {
    title: "Review and approve",
    description:
      "Manage your content pipeline. Review drafts, leave comments, run brand consistency checks, and approve posts before they go live.",
    targetRoute: "/approval",
  },
  {
    title: "Schedule and publish",
    description:
      "See all your content on the calendar. Drag and drop to reschedule, spot conflicts, and export your plan.",
    targetRoute: "/calendar",
  },
  {
    title: "Track performance",
    description:
      "Monitor reach, engagement, and growth across all platforms. Export reports and learn what works best for your audience.",
    targetRoute: "/analytics",
  },
  {
    title: "You're all set!",
    description:
      "Start by onboarding your business — everything else flows from there. You can revisit this tour anytime from settings.",
    targetRoute: "/dashboard",
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "conduit-tour-completed";

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);

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
    const target = TOUR_STEPS[next];
    if (target && target.targetRoute !== pathname) {
      router.push(target.targetRoute);
    }
  }, [step, dismiss, router, pathname]);

  const goPrev = useCallback(() => {
    const prev = step - 1;
    if (prev < 0) return;
    setStep(prev);
    const target = TOUR_STEPS[prev];
    if (target && target.targetRoute !== pathname) {
      router.push(target.targetRoute);
    }
  }, [step, router, pathname]);

  if (!visible || step < 0) return null;

  const current = TOUR_STEPS[step];
  if (!current) return null;
  const isCenter = current.position === "center";
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />
      {/* Tour card */}
      <div
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
