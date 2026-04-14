"use client";

import { useState } from "react";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { Platform } from "@/lib/types";
import { FieldCharCounter } from "@/components/field-char-counter";

type RefinementEntry = {
  instruction: string;
  refinedCaption: string;
  refinedHashtags: string[];
  refinedCta: string;
  explanation: string;
  applied: boolean;
};

export function ContentRefiner({
  draft,
  onApply,
}: {
  draft: ContentDraftRecord;
  onApply: (update: { caption: string; hashtags: string[]; cta: string }) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<RefinementEntry[]>([]);

  const pk = PLATFORM_KNOWLEDGE[draft.platform as Platform];
  const charCount = draft.caption.length;

  async function handleRefine() {
    if (!instruction.trim()) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/drafts/${draft.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to refine content");

      const entry: RefinementEntry = {
        instruction: instruction.trim(),
        ...data.refinement,
        applied: false,
      };
      setHistory((h) => [...h, entry]);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refine content");
    } finally {
      setLoading(false);
    }
  }

  function applyRefinement(index: number) {
    const entry = history[index];
    if (!entry) return;

    onApply({
      caption: entry.refinedCaption,
      hashtags: entry.refinedHashtags,
      cta: entry.refinedCta,
    });

    setHistory((h) =>
      h.map((item, i) => (i === index ? { ...item, applied: true } : item))
    );
  }

  function revertRefinement(index: number) {
    setHistory((h) => h.filter((_, i) => i !== index));
  }

  const hashtagTagCount = draft.hashtags.length;
  const hashtagTextLen = draft.hashtags.join(" ").length;
  const ctaMax =
    draft.platform === "x" ? 200 : draft.platform === "gbp" ? 150 : 280;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Content Refiner</p>
        <div className="flex flex-wrap gap-2">
          <FieldCharCounter current={charCount} max={pk?.charLimit ?? null} label="Caption" />
          <FieldCharCounter
            label="Tags"
            current={hashtagTagCount}
            max={pk?.hashtagLimits.max && pk.hashtagLimits.max > 0 ? pk.hashtagLimits.max : null}
          />
          <FieldCharCounter label="Hashtag text" current={hashtagTextLen} max={null} />
          <FieldCharCounter current={draft.cta.length} max={ctaMax} label="CTA" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          {history.map((entry, i) => (
            <div
              key={i}
              className={`rounded-md border p-2 text-xs ${
                entry.applied ? "bg-primary/5 border-primary/20" : ""
              }`}
            >
              <p className="font-medium text-muted-foreground">You: {entry.instruction}</p>
              <p className="mt-1">{entry.explanation}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {entry.refinedCaption.slice(0, 140)}
                {entry.refinedCaption.length > 140 ? "..." : ""}
              </p>
              {!entry.applied && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyRefinement(i)}
                    className="inline-flex h-6 items-center rounded border bg-primary px-2 text-xs text-primary-foreground"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => revertRefinement(i)}
                    className="inline-flex h-6 items-center rounded border px-2 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {entry.applied && (
                <p className="mt-1 text-xs text-primary">Applied</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-end">
          <FieldCharCounter current={instruction.length} max={500} label="Instruction" />
        </div>
        <div className="flex gap-2">
        <input
          type="text"
          className="h-8 flex-1 rounded-md border bg-transparent px-3 text-sm"
          placeholder="Tell me how to change this..."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleRefine();
            }
          }}
          disabled={loading}
        />
        <button
          type="button"
          disabled={loading || !instruction.trim()}
          onClick={() => void handleRefine()}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Refining..." : "Refine"}
        </button>
        </div>
      </div>
    </div>
  );
}
