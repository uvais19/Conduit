import { Suspense } from "react";
import { StrategyFirstDraftGenerating } from "@/components/strategy-first-draft-generating";

function GeneratingFallback() {
  return (
    <div className="mx-auto max-w-lg py-16 text-sm text-muted-foreground">Preparing strategy…</div>
  );
}

export default function StrategyGeneratingPage() {
  return (
    <Suspense fallback={<GeneratingFallback />}>
      <StrategyFirstDraftGenerating />
    </Suspense>
  );
}
