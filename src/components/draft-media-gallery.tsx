"use client";

import { useState } from "react";
import { resolveDraftMediaSrc } from "@/lib/media/resolve-url";

type Props = {
  urls: string[];
  className?: string;
  /** e.g. Reels / Shorts — shows 9:16 hint when true */
  verticalShortForm?: boolean;
};

function isProbablyVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov|m4v|avi)(\?|#|$)/i.test(u.trim());
}

function KeyedPreviewImage({
  src,
  alt,
  errorFooter,
}: {
  src: string;
  alt: string;
  errorFooter: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote + dynamic local API URLs */}
      <img
        src={src}
        alt={alt}
        className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
        onError={() => setFailed(true)}
      />
      {failed && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">{errorFooter}</p>
      )}
    </>
  );
}

function KeyedPreviewVideo({
  src,
  errorFooter,
}: {
  src: string;
  errorFooter: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">{errorFooter}</p>;
  }
  return (
    <video
      src={src}
      controls
      playsInline
      className="mx-auto max-h-[min(70vh,520px)] w-full bg-black object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function DraftMediaGallery({ urls, className, verticalShortForm }: Props) {
  const list = urls.map((u) => u.trim()).filter(Boolean);
  const [index, setIndex] = useState(0);

  if (list.length === 0) return null;

  const safeIndex = Math.min(index, list.length - 1);
  const raw = list[safeIndex]!;
  const src = resolveDraftMediaSrc(raw);
  const isVideo = isProbablyVideoUrl(raw);

  const missingHint =
    "Could not load this file. Regenerate the image, or configure R2 for persistent storage.";

  const mediaBlock = isVideo ? (
    <KeyedPreviewVideo
      key={src}
      src={src}
      errorFooter="Could not play this video. Re-upload or check storage / URL."
    />
  ) : (
    <KeyedPreviewImage
      key={src}
      src={src}
      alt="Draft media"
      errorFooter={missingHint}
    />
  );

  return (
    <div className={className}>
      {verticalShortForm && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          9:16 preview — optimized for Reels, Shorts, and vertical Stories.
        </p>
      )}
      <div
        className={`overflow-hidden rounded-lg border bg-muted/30 ${
          verticalShortForm ? "mx-auto max-w-sm" : ""
        }`}
      >
        {mediaBlock}
        {list.length > 1 && (
          <div className="flex items-center justify-between gap-2 border-t bg-background/95 px-3 py-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
              disabled={safeIndex <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {safeIndex + 1} / {list.length}
            </span>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
              disabled={safeIndex >= list.length - 1}
              onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
