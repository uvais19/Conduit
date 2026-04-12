"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Sparkles, Calendar, X } from "lucide-react";

const ACTIONS = [
  {
    label: "New draft",
    description: "Create a blank content draft",
    href: "/content/drafts",
    icon: FileText,
  },
  {
    label: "AI generate",
    description: "Use AI to generate content",
    href: "/content/generate",
    icon: Sparkles,
  },
  {
    label: "Schedule post",
    description: "Open the content calendar",
    href: "/calendar",
    icon: Calendar,
  },
];

export function QuickCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, toggle]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Action menu */}
      {open && (
        <div className="fixed bottom-20 right-6 z-[91] w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setOpen(false);
                router.push(action.href);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <action.icon className="size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
          <div className="mt-1 border-t border-border/60 px-3 pt-1.5">
            <p className="text-[10px] text-muted-foreground">
              Press <kbd className="rounded border px-1 font-mono text-[10px]">⌘J</kbd> to toggle
            </p>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[91] flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Quick create"
      >
        {open ? (
          <X className="size-5" />
        ) : (
          <Plus className="size-5" />
        )}
      </button>
    </>
  );
}
