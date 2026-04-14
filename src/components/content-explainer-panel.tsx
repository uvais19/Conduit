"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type Props = {
  title: string;
  body: string;
  defaultOpen?: boolean;
};

/** Consistent “why this hook / angle / visual” explainer across writer and visual flows. */
export function ContentExplainerPanel({ title, body, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (!body.trim()) return null;

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        <span>{title}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="border-t border-primary/10 px-3 pb-3 pt-1 text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}
