/** Roadmap 1.7 — visible indicator for live vs simulated analytics rows. */

export function MetricsDataSourceBadge({
  live,
  simulated,
}: {
  live: number;
  simulated: number;
}) {
  if (live === 0 && simulated === 0) return null;
  const label =
    live > 0 && simulated > 0
      ? "Mixed: live + simulated"
      : live > 0
        ? "Live platform data"
        : "Simulated metrics";
  return (
    <span
      className="inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
      title={`${live} live / ${simulated} simulated (latest metric snapshot per published post)`}
    >
      {label}
    </span>
  );
}
