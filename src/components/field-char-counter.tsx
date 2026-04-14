"use client";

export function FieldCharCounter({
  current,
  max,
  label,
}: {
  current: number;
  max: number | null | undefined;
  label?: string;
}) {
  if (max == null || max <= 0) {
    return (
      <span className="text-xs tabular-nums text-muted-foreground">
        {label ? `${label} ` : ""}
        {current} chars
      </span>
    );
  }
  const over = current > max;
  return (
    <span
      className={`text-xs tabular-nums ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
    >
      {label ? `${label} ` : ""}
      {current}/{max}
    </span>
  );
}
