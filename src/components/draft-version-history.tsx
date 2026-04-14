"use client";

import { useCallback, useEffect, useState } from "react";
import type { DraftVersion } from "@/lib/content/versioning";
import type { ContentDraftRecord } from "@/lib/content/types";
import { toast } from "sonner";

type Props = {
  draft: ContentDraftRecord;
  onDraftUpdated: (draft: ContentDraftRecord) => void;
};

function hashtagsToString(h: unknown): string {
  if (Array.isArray(h)) return (h as string[]).join(" ");
  return "";
}

export function DraftVersionHistory({ draft, onDraftUpdated }: Props) {
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drafts/versions?draftId=${encodeURIComponent(draft.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load versions");
      setVersions((data.versions as DraftVersion[]) ?? []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [draft.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  async function restore() {
    if (!selected) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/drafts/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          restoreVersionId: selected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restore failed");
      onDraftUpdated(data.draft as ContentDraftRecord);
      toast.success(`Restored from ${selected.version}`);
      await load();
      setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading version history…</p>;
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No saved versions yet. Saving the draft records a version automatically; you can also use
        &quot;Snapshot to history&quot; before big edits.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Version history</p>
        <button
          type="button"
          disabled={!selected || restoring}
          onClick={() => void restore()}
          className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {restoring ? "Restoring…" : "Rollback to selected"}
        </button>
      </div>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
        {versions.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`w-full rounded border px-2 py-1.5 text-left ${
                selectedId === v.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/40"
              }`}
            >
              <span className="font-medium">{v.version}</span>
              <span className="text-muted-foreground">
                {" "}
                · {new Date(v.createdAt).toLocaleString()}
              </span>
              {v.changeDescription && (
                <span className="block text-muted-foreground">{v.changeDescription}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="space-y-3 border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground">Diff vs current draft</p>
          <VersionFieldsDiff
            current={{
              caption: draft.caption,
              hashtags: draft.hashtags.join(" "),
              cta: draft.cta,
            }}
            version={{
              caption: selected.caption,
              hashtags: hashtagsToString(selected.hashtags),
              cta: selected.cta ?? "",
            }}
          />
        </div>
      )}
    </div>
  );
}

function VersionFieldsDiff({
  current,
  version,
}: {
  current: { caption: string; hashtags: string; cta: string };
  version: { caption: string; hashtags: string; cta: string };
}) {
  const fields: { key: "caption" | "hashtags" | "cta"; label: string }[] = [
    { key: "caption", label: "Caption" },
    { key: "hashtags", label: "Hashtags" },
    { key: "cta", label: "CTA" },
  ];

  return (
    <div className="space-y-3">
      {fields.map(({ key, label }) => {
        const cur = current[key];
        const ver = version[key];
        const same = cur === ver;
        return (
          <div key={key}>
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
            {same ? (
              <p className="text-xs text-muted-foreground">No change from current.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Selected version
                  </p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-2 text-[11px] leading-snug">
                    {ver || "—"}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Current draft
                  </p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border p-2 text-[11px] leading-snug">
                    {cur || "—"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
