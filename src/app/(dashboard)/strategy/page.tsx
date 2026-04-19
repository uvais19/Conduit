import { Suspense } from "react";
import { StrategyBuilder } from "@/components/strategy-builder";

function StrategyPageFallback() {
  return <div className="text-sm text-muted-foreground">Loading strategy…</div>;
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<StrategyPageFallback />}>
      <StrategyBuilder />
    </Suspense>
  );
}
