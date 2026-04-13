"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  /** Optional draft status filter passed to the export API */
  statusFilter?: string;
  className?: string;
};

export function ExportDraftsButton({ statusFilter, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function runExport(format: "csv" | "json") {
    setBusy(true);
    try {
      const u = new URL("/api/content/export", window.location.origin);
      u.searchParams.set("format", format);
      if (statusFilter) u.searchParams.set("status", statusFilter);
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `conduit-drafts-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success(`Exported drafts (${format.toUpperCase()})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground sr-only sm:not-sr-only sm:mr-1">
        Export all drafts
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runExport("csv")}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
      >
        <Download className="size-3.5" />
        CSV
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runExport("json")}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
      >
        <Download className="size-3.5" />
        JSON
      </button>
    </div>
  );
}
