"use client";

import { X } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  entries: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    entries: [
      { keys: ["⌘", "B"], label: "Toggle sidebar" },
      { keys: ["⌘", "J"], label: "Quick create menu" },
    ],
  },
  {
    title: "Actions",
    entries: [
      { keys: ["Ctrl", "Enter"], label: "Submit form" },
      { keys: ["Esc"], label: "Close dialog / cancel" },
    ],
  },
  {
    title: "Help",
    entries: [{ keys: ["?"], label: "Show keyboard shortcuts" }],
  },
];

export function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="fixed left-1/2 top-1/2 z-[101] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {group.entries.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span>{entry.label}</span>
                    <span className="flex items-center gap-1">
                      {entry.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
          Press <kbd className="rounded border px-1 font-mono text-[10px]">?</kbd> to toggle this dialog.
          On Mac, use <kbd className="rounded border px-1 font-mono text-[10px]">⌘</kbd> instead of Ctrl.
        </p>
      </div>
    </>
  );
}
