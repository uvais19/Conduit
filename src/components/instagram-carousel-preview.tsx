"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send } from "lucide-react";
import type { ContentDraftRecord } from "@/lib/content/types";

type Props = {
  draft: ContentDraftRecord;
};

/**
 * Approximates Instagram feed carousel framing (4:5 card, slide dots, caption block).
 */
export function InstagramCarouselPreview({ draft }: Props) {
  const slides = draft.carousel;
  const [index, setIndex] = useState(0);

  if (draft.platform !== "instagram" || slides.length === 0) {
    return null;
  }

  const safe = Math.min(index, slides.length - 1);
  const slide = slides[safe]!;

  return (
    <div className="mx-auto max-w-[320px]">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Instagram feed preview
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-black text-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-orange-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">yourbrand</p>
            <p className="text-[10px] text-white/60">Sponsored</p>
          </div>
        </div>

        <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          <div className="absolute inset-0 flex flex-col justify-end p-4 pt-16">
            <p className="text-lg font-bold leading-tight drop-shadow-md">{slide.heading}</p>
            <p className="mt-2 text-sm leading-snug text-white/90 drop-shadow">{slide.body}</p>
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                className="absolute left-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm disabled:opacity-25"
                disabled={safe <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm disabled:opacity-25"
                disabled={safe >= slides.length - 1}
                onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {slides.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === safe ? "w-2 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 border-b border-white/10 px-3 py-2">
          <Heart className="size-6" strokeWidth={1.75} />
          <MessageCircle className="size-6" strokeWidth={1.75} />
          <Send className="size-6" strokeWidth={1.75} />
        </div>

        <div className="max-h-28 overflow-y-auto px-3 py-2 text-left">
          <p className="text-xs">
            <span className="font-semibold">yourbrand </span>
            <span className="text-white/90">
              {draft.caption.slice(0, 220)}
              {draft.caption.length > 220 ? "…" : ""}
            </span>
          </p>
          {draft.hashtags.length > 0 && (
            <p className="mt-1 text-[11px] text-blue-300">
              {draft.hashtags.slice(0, 6).join(" ")}
              {draft.hashtags.length > 6 ? "…" : ""}
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {safe + 1} of {slides.length} — swipe-style preview (4:5 feed card)
      </p>
    </div>
  );
}
