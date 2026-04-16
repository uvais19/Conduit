"use client";

import { useCallback, useEffect, useState } from "react";
import { ShortcutHelpDialog } from "@/components/shortcut-help-dialog";

/**
 * Global keyboard shortcut handler for dashboard routes.
 *
 * Handled shortcuts:
 *  - Ctrl/⌘ + Enter → Submit the nearest form or click the primary button
 *  - ?              → Toggle shortcut help dialog
 *  - Esc            → Close shortcut help (other Esc for modals handled by Radix/base-ui)
 *
 * ⌘+J (QuickCreate) and ⌘+B (sidebar) are handled by their own components.
 */
export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const toggleHelp = useCallback(() => setShowHelp((v) => !v), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;

      // ? — toggle shortcut help (only when not typing in an input)
      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // Esc — close shortcut help
      if (e.key === "Escape" && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      // Ctrl/⌘ + Enter — submit nearest form
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        // Try to find the nearest form and submit it
        const activeEl = document.activeElement as HTMLElement | null;
        const form = activeEl?.closest("form");
        if (form) {
          // Find the submit button or a primary action button within the form
          const submitBtn = form.querySelector<HTMLButtonElement>(
            'button[type="submit"], button:not([type="button"])'
          );
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            return;
          }
          // Fallback: trigger form submit
          form.requestSubmit();
          return;
        }

        // No form found — try to click the nearest primary button in the page
        const primaryBtn = document.querySelector<HTMLButtonElement>(
          'button.bg-primary:not(:disabled), button[data-primary="true"]:not(:disabled)'
        );
        if (primaryBtn) {
          primaryBtn.click();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp, toggleHelp]);

  if (!showHelp) return null;

  return <ShortcutHelpDialog onClose={() => setShowHelp(false)} />;
}
