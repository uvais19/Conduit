"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutoAdvanceBannerProps {
  /** Where the user will be redirected */
  destination: string;
  /** Human-readable label for the destination (e.g. "Content Strategy") */
  label: string;
  /** Delay in milliseconds before auto-advancing (default 5000) */
  delayMs?: number;
  /** Called when the user cancels auto-advance */
  onCancel?: () => void;
}

export function AutoAdvanceBanner({
  destination,
  label,
  delayMs = 5000,
  onCancel,
}: AutoAdvanceBannerProps) {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const frameRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    router.refresh();
    router.push(destination);
  }, [router, destination]);

  const cancel = useCallback(() => {
    setCancelled(true);
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (cancelled) return;

    function tick() {
      const now = Date.now();
      const ms = now - startRef.current;
      setElapsed(ms);
      if (ms >= delayMs) {
        advance();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [cancelled, delayMs, advance]);

  if (cancelled) return null;

  const progress = Math.min(100, (elapsed / delayMs) * 100);
  const secondsLeft = Math.max(0, Math.ceil((delayMs - elapsed) / 1000));

  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/5 p-4">
      {/* Progress bar */}
      <div
        className="absolute inset-x-0 bottom-0 h-1 bg-primary/20"
        aria-hidden
      >
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="size-4 shrink-0 text-primary" />
          <span>
            Taking you to <strong>{label}</strong> in{" "}
            <span className="tabular-nums font-medium">{secondsLeft}s</span>…
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={cancel}
          >
            <X className="size-3.5" />
            Stay here
          </Button>
          <Button size="sm" className="h-8" onClick={advance}>
            Go now
          </Button>
        </div>
      </div>
    </div>
  );
}
