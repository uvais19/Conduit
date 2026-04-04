"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { ContentStrategy } from "@/lib/types";
import { buildCalendarPreview, type CalendarPreviewItem } from "@/lib/strategy/defaults";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { DraftVisualEditor } from "@/components/draft-visual-editor";
import { DraftTimeline } from "@/components/draft-timeline";
import { ContentRefiner } from "@/components/content-refiner";
import {
  groupVariants,
  sortVariantGroupsByRecent,
} from "@/lib/content/group-variants";

type DraftFilters = {
  platform: "all" | (typeof PLATFORMS)[number];
  status: "all" | ContentDraftRecord["status"];
  pillar: string;
};

const initialFilters: DraftFilters = {
  platform: "all",
  status: "all",
  pillar: "",
};

function renderPreview(draft: ContentDraftRecord): string {
  switch (draft.platform) {
    case "x":
      return `${draft.caption}\n\n${draft.hashtags.slice(0, 3).join(" ")}`;
    case "instagram":
      return `${draft.caption}\n\n${draft.hashtags.join(" ")}`;
    case "linkedin":
      return `${draft.caption}\n\n${draft.hashtags.slice(0, 5).join(" ")}`;
    case "facebook":
      return `${draft.caption}\n\n${draft.hashtags.slice(0, 5).join(" ")}`;
    case "gbp":
      return draft.caption;
  }
}

export function DraftsEditor() {
  const [filters, setFilters] = useState<DraftFilters>(initialFilters);
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(true);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedId) ?? null,
    [drafts, selectedId]
  );

  const plannedItems = useMemo(() => {
    if (!strategy) return [];
    const items = buildCalendarPreview(strategy);
    return items.filter((item) => {
      if (filters.platform !== "all" && item.platform !== filters.platform) return false;
      if (filters.pillar.trim() && !item.pillar.toLowerCase().includes(filters.pillar.trim().toLowerCase())) return false;
      return true;
    });
  }, [strategy, filters.platform, filters.pillar]);

  const showPlannedContent = drafts.length === 0 && !loading && plannedItems.length > 0;
  const [selectedPlannedId, setSelectedPlannedId] = useState<string>("");

  const selectedPlanned = useMemo(
    () => plannedItems.find((item) => item.id === selectedPlannedId) ?? null,
    [plannedItems, selectedPlannedId]
  );

  const draftGroups = useMemo(
    () => sortVariantGroupsByRecent(groupVariants(drafts)),
    [drafts]
  );

  async function fetchDrafts() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filters.platform !== "all") params.set("platform", filters.platform);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.pillar.trim()) params.set("pillar", filters.pillar.trim());

      const response = await fetch(`/api/drafts?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load drafts");
      }

      const nextDrafts = data.drafts as ContentDraftRecord[];
      setDrafts(nextDrafts);

      if (!nextDrafts.find((draft) => draft.id === selectedId)) {
        setSelectedId(nextDrafts[0]?.id ?? "");
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.platform, filters.status, filters.pillar]);

  useEffect(() => {
    async function loadStrategy() {
      try {
        const response = await fetch("/api/strategy");
        const data = await response.json();
        if (response.ok && data.strategy) {
          setStrategy(data.strategy as ContentStrategy);
        }
      } catch {
        // Strategy is optional — ignore errors
      } finally {
        setStrategyLoading(false);
      }
    }
    void loadStrategy();
  }, []);

  async function submitForReview() {
    if (!selectedDraft) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit draft");
      }

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === selectedDraft.id ? (data.draft as ContentDraftRecord) : draft
        )
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit draft");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraft() {
    if (!selectedDraft) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: selectedDraft.caption,
          hashtags: selectedDraft.hashtags,
          cta: selectedDraft.cta,
          pillar: selectedDraft.pillar,
          mediaUrls: selectedDraft.mediaUrls,
          mediaType: selectedDraft.mediaType,
          carousel: selectedDraft.carousel,
          storyTemplate: selectedDraft.storyTemplate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save draft");
      }

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === selectedDraft.id ? (data.draft as ContentDraftRecord) : draft
        )
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save draft");
    } finally {
      setSaving(false);
    }
  }

  function patchSelectedDraft(patch: Partial<ContentDraftRecord>) {
    if (!selectedDraft) return;
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === selectedDraft.id ? { ...draft, ...patch } : draft
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Drafts</h1>
        <p className="text-muted-foreground">
          Edit generated drafts and review per-platform live preview.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            Platform
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={filters.platform}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  platform: event.target.value as DraftFilters["platform"],
                }))
              }
            >
              <option value="all">All platforms</option>
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            Status
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as DraftFilters["status"],
                }))
              }
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in-review">In review</option>
              <option value="revision-requested">Revision requested</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            Pillar
            <Input
              value={filters.pillar}
              onChange={(event) =>
                setFilters((current) => ({ ...current, pillar: event.target.value }))
              }
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{showPlannedContent ? "Planned Content" : "Draft List"}</CardTitle>
            {showPlannedContent && (
              <CardDescription>
                From your content strategy. Go to{" "}
                <Link href="/content/generate" className="underline">
                  Generate
                </Link>{" "}
                to create editable drafts.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {loading || strategyLoading ? (
              <p className="text-sm text-muted-foreground">Loading drafts...</p>
            ) : showPlannedContent ? (
              plannedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPlannedId(item.id)}
                  className={`w-full rounded-md border p-2 text-left text-sm ${
                    selectedPlannedId === item.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <p className="font-medium">
                    {item.theme} · {PLATFORM_LABELS[item.platform]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.pillar} · {item.day} {item.time}</p>
                </button>
              ))
            ) : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts found.</p>
            ) : (
              <div className="space-y-3">
                {draftGroups.map((group) => {
                  if (group.variants.length === 1) {
                    const draft = group.variants[0]!;
                    return (
                      <button
                        key={draft.id}
                        type="button"
                        onClick={() => setSelectedId(draft.id)}
                        className={`w-full rounded-md border p-2 text-left text-sm ${
                          selectedId === draft.id ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <p className="font-medium">
                          {draft.variantLabel} · {PLATFORM_LABELS[draft.platform]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{draft.pillar}</p>
                      </button>
                    );
                  }

                  const platformLabel = group.platform
                    ? PLATFORM_LABELS[group.platform]
                    : "";
                  return (
                    <div
                      key={group.variantGroup}
                      className="rounded-lg border border-border/80 bg-muted/15 p-2.5"
                    >
                      <div className="mb-2 space-y-0.5 px-0.5">
                        <p className="text-sm font-medium leading-snug">
                          {group.pillar?.trim() || "Content set"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {platformLabel}
                          {platformLabel ? " · " : ""}
                          {group.variants.length} variant
                          {group.variants.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {group.variants.map((draft) => (
                          <button
                            key={draft.id}
                            type="button"
                            onClick={() => setSelectedId(draft.id)}
                            className={`w-full rounded-md border bg-background px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/40 ${
                              selectedId === draft.id
                                ? "border-primary bg-primary/5"
                                : "border-border/60"
                            }`}
                          >
                            <p className="font-medium">Variant {draft.variantLabel}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {draft.caption.trim() || "No caption yet"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editor & Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showPlannedContent ? (
              !selectedPlanned ? (
                <p className="text-sm text-muted-foreground">Select a planned item to preview.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform</p>
                      <p className="text-sm font-medium capitalize">{PLATFORM_LABELS[selectedPlanned.platform]}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Content Type</p>
                      <p className="text-sm font-medium capitalize">{selectedPlanned.contentType}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scheduled</p>
                      <p className="text-sm font-medium">{selectedPlanned.day} at {selectedPlanned.time}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pillar</p>
                      <p className="text-sm font-medium">{selectedPlanned.pillar}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Theme</p>
                    <p className="text-sm font-medium">{selectedPlanned.theme}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
                    <p className="text-sm">{selectedPlanned.summary}</p>
                  </div>
                  <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      This is a planned post from your strategy. Generate a draft to edit and customize it.
                    </p>
                    <Link
                      href={`/content/generate?platform=${selectedPlanned.platform}&pillar=${encodeURIComponent(selectedPlanned.pillar)}&topic=${encodeURIComponent(selectedPlanned.theme)}&contentType=${encodeURIComponent(selectedPlanned.contentType)}`}
                      className={buttonVariants({ className: "mt-3" })}
                    >
                      Generate Draft
                    </Link>
                  </div>
                </div>
              )
            ) : !selectedDraft ? (
              <p className="text-sm text-muted-foreground">Select a draft to edit.</p>
            ) : (
              <>
                <label className="space-y-2 text-sm">
                  Caption
                  <textarea
                    className="min-h-32 w-full rounded-md border bg-transparent px-3 py-2"
                    value={selectedDraft.caption}
                    onChange={(event) =>
                      patchSelectedDraft({ caption: event.target.value })
                    }
                  />
                </label>

                <label className="space-y-2 text-sm">
                  Hashtags (space separated)
                  <Input
                    value={selectedDraft.hashtags.join(" ")}
                    onChange={(event) =>
                      patchSelectedDraft({
                        hashtags: event.target.value
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
                      })
                    }
                  />
                </label>

                <label className="space-y-2 text-sm">
                  CTA
                  <Input
                    value={selectedDraft.cta}
                    onChange={(event) => patchSelectedDraft({ cta: event.target.value })}
                  />
                </label>

                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Live Preview ({PLATFORM_LABELS[selectedDraft.platform]})
                  </p>
                  <pre className="whitespace-pre-wrap text-sm">{renderPreview(selectedDraft)}</pre>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving || submitting}
                    className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Draft"}
                  </button>

                  {(selectedDraft.status === "draft" || selectedDraft.status === "revision-requested") && (
                    <button
                      type="button"
                      onClick={submitForReview}
                      disabled={saving || submitting}
                      className="inline-flex h-9 items-center rounded-md border border-primary px-4 text-sm font-medium text-primary disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit for Review"}
                    </button>
                  )}
                </div>

                <DraftVisualEditor
                  draft={selectedDraft}
                  onDraftChange={(nextDraft) => {
                    setDrafts((current) =>
                      current.map((draft) =>
                        draft.id === nextDraft.id ? nextDraft : draft
                      )
                    );
                  }}
                />

                <ContentRefiner
                  draft={selectedDraft}
                  onApply={(update) => {
                    const patched = { ...selectedDraft, ...update };
                    setDrafts((current) =>
                      current.map((draft) =>
                        draft.id === patched.id ? patched : draft
                      )
                    );
                  }}
                />

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Activity Timeline
                  </p>
                  <DraftTimeline draftId={selectedDraft.id} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
