"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  consumeStrategyGenerateStream,
  fetchLatestStrategyFromApi,
} from "@/lib/strategy/consume-strategy-generate-stream";

/** Dedupes React Strict Mode double mount for the same navigation. */
let firstDraftGenerationInFlight: Promise<void> | null = null;

export function StrategyFirstDraftGenerating() {
  const router = useRouter();
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function runOnce() {
      setError("");
      setStep("Connecting…");
      try {
        const response = await fetch("/api/strategy/generate", { method: "POST" });
        const { doneReceived } = await consumeStrategyGenerateStream(response, {
          onProgress: (message) => setStep(message || "Working…"),
          onDone: () => {
            /* state lives in DB; we redirect and let /strategy GET load it */
          },
        });
        if (!doneReceived) {
          const latest = await fetchLatestStrategyFromApi({ attempts: 12, delayMs: 200 });
          if (!latest) {
            throw new Error(
              "Generation finished but the strategy could not be loaded. Try again or open Content strategy."
            );
          }
        }
        if (!cancelledRef.current) {
          router.replace("/calendar?from=onboarding");
        }
      } catch (e) {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "Strategy generation failed");
        }
      }
    }

    if (firstDraftGenerationInFlight) {
      void firstDraftGenerationInFlight.then(() => {
        if (!cancelledRef.current) {
          router.replace("/calendar?from=onboarding");
        }
      });
      return () => {
        cancelledRef.current = true;
      };
    }

    firstDraftGenerationInFlight = runOnce().finally(() => {
      firstDraftGenerationInFlight = null;
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [router]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-16">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Building your content strategy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We are generating pillars, schedules, and weekly themes from your brand manifesto. This
          usually takes under a minute.
        </p>
      </div>
      {!error ? (
        <div className="space-y-2">
          <Progress value={step ? 60 : 25} className="h-2" />
          <p className="text-xs text-muted-foreground">{step || "Starting…"}</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p>{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
              Try again
            </Button>
            <Link
              href="/brand"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex")}
            >
              Back to brand manifesto
            </Link>
            <Link
              href="/strategy"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex")}
            >
              Open content strategy
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
