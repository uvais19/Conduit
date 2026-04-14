"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { ContentStrategy } from "@/lib/types";
import { buildCalendarPreview, type CalendarPreviewItem } from "@/lib/strategy/defaults";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { DraftVisualEditor } from "@/components/draft-visual-editor";
import { DraftTimeline } from "@/components/draft-timeline";
import { ContentRefiner } from "@/components/content-refiner";
import { FieldCharCounter } from "@/components/field-char-counter";
import { ContentExplainerPanel } from "@/components/content-explainer-panel";
import { DraftVersionHistory } from "@/components/draft-version-history";
import { ExportDraftsButton } from "@/components/export-drafts-button";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { Platform } from "@/lib/types";
import { toast } from "sonner";
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

const DRAFT_FILTER_HINTS = {
  platform: "Limit the list to one network or show drafts for every connected platform.",
  status:
    "Workflow stage — e.g. draft vs in review vs published. Helps you focus on what needs action.",
  pillar: "Free-text match against the strategy pillar saved on each draft.",
} as const;

const DRAFT_EDIT_HINTS = {
  caption: "The main post body writers and previews use. Line breaks are preserved where the platform allows.",
  hashtags:
    "Space-separated tags; # is added automatically if missing. Preview may show a subset on character-limited platforms.",
  cta: "The explicit call-to-action line, often merged into the caption or shown in the preview block.",
} as const;

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
  const [adaptingTo, setAdaptingTo] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [snapshotting, setSnapshotting] = useState(false);

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
    async function loadCampaigns() {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        if (res.ok && Array.isArray(data.campaigns)) {
          setCampaigns(
            data.campaigns.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // optional
      }
    }
    void loadCampaigns();
  }, []);

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
          campaignId: selectedDraft.campaignId ?? null,
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

      const saved = data.draft as ContentDraftRecord;
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === selectedDraft.id ? saved : draft
        )
      );

      try {
        await fetch("/api/drafts/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftId: saved.id,
            caption: saved.caption,
            hashtags: saved.hashtags,
            cta: saved.cta,
            changeDescription: "Auto-saved from drafts editor",
          }),
        });
      } catch {
        // Version snapshot is best-effort; save already succeeded
      }
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

  async function saveVersionSnapshot() {
    if (!selectedDraft) return;
    setSnapshotting(true);
    try {
      const res = await fetch("/api/drafts/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          caption: selectedDraft.caption,
          hashtags: selectedDraft.hashtags,
          cta: selectedDraft.cta,
          changeDescription: "Manual snapshot from drafts editor",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Snapshot failed");
      toast.success(`Saved ${data.version?.version ?? "version"} to history`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot failed");
    } finally {
      setSnapshotting(false);
    }
  }

  async function createCampaign() {
    const name = newCampaignName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create campaign");
      const c = data.campaign as { id: string; name: string };
      setCampaigns((prev) => [{ id: c.id, name: c.name }, ...prev]);
      setNewCampaignName("");
      toast.success("Campaign created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create campaign");
    }
  }

  async function handleAdaptTo(targetPlatform: string) {
    if (!selectedDraft) return;
    setAdaptingTo(targetPlatform);
    try {
      const res = await fetch("/api/content/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectedDraft.caption,
          sourcePlatform: selectedDraft.platform,
          targetPlatform,
          hashtags: selectedDraft.hashtags,
          cta: selectedDraft.cta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Adaptation failed");
      patchSelectedDraft({ caption: data.adapted });
      toast.success(`Adapted for ${PLATFORM_LABELS[targetPlatform as keyof typeof PLATFORM_LABELS] ?? targetPlatform}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Adaptation failed");
    } finally {
      setAdaptingTo(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Drafts</h1>
          <p className="text-muted-foreground">
            Edit generated drafts and review per-platform live preview.
          </p>
        </div>
        <ExportDraftsButton />
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
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="draft-filter-platform"
              label="Platform"
              hint={DRAFT_FILTER_HINTS.platform}
            />
            <select
              id="draft-filter-platform"
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
          </div>

          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="draft-filter-status"
              label="Status"
              hint={DRAFT_FILTER_HINTS.status}
            />
            <select
              id="draft-filter-status"
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
          </div>

          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="draft-filter-pillar"
              label="Pillar"
              hint={DRAFT_FILTER_HINTS.pillar}
            />
            <Input
              id="draft-filter-pillar"
              value={filters.pillar}
              onChange={(event) =>
                setFilters((current) => ({ ...current, pillar: event.target.value }))
              }
            />
          </div>
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
                {selectedDraft.writerRationale && (
                  <ContentExplainerPanel
                    title="Why this hook / angle (writer)"
                    body={selectedDraft.writerRationale}
                    defaultOpen
                  />
                )}
                {selectedDraft.visualPlanData?.designRationale && (
                  <ContentExplainerPanel
                    title="Why this visual angle (designer)"
                    body={selectedDraft.visualPlanData.designRationale}
                    defaultOpen
                  />
                )}

                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Campaign
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <label htmlFor="draft-campaign" className="text-xs text-muted-foreground">
                        Assign draft
                      </label>
                      <select
                        id="draft-campaign"
                        className="h-9 w-full rounded-md border bg-transparent px-3"
                        value={selectedDraft.campaignId ?? ""}
                        onChange={(e) =>
                          patchSelectedDraft({
                            campaignId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">No campaign</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-1 gap-2">
                      <Input
                        placeholder="New campaign name"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => void createCampaign()}
                        className="shrink-0 rounded-md border px-3 text-xs font-medium"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                  {selectedDraft.campaignId && (
                    <button
                      type="button"
                      className="mt-3 inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium"
                      onClick={async () => {
                        const start = window.prompt(
                          "First publish slot (ISO date/time, e.g. 2026-04-20T10:00:00)",
                          new Date(Date.now() + 86400000).toISOString().slice(0, 16)
                        );
                        if (!start) return;
                        const hours = window.prompt("Hours between posts", "24");
                        const h = hours ? Number(hours) : 24;
                        try {
                          const res = await fetch(
                            `/api/campaigns/${selectedDraft.campaignId}/schedule`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                startAt: new Date(start).toISOString(),
                                hoursBetween: Number.isFinite(h) && h > 0 ? h : 24,
                              }),
                            }
                          );
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? "Schedule failed");
                          toast.success(data.message ?? "Scheduled");
                          void fetchDrafts();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Schedule failed");
                        }
                      }}
                    >
                      Schedule approved drafts in campaign
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabelWithHint
                      htmlFor="draft-edit-caption"
                      label="Caption"
                      hint={DRAFT_EDIT_HINTS.caption}
                    />
                    <FieldCharCounter
                      current={selectedDraft.caption.length}
                      max={PLATFORM_KNOWLEDGE[selectedDraft.platform as Platform].charLimit}
                    />
                  </div>
                  <textarea
                    id="draft-edit-caption"
                    className="min-h-32 w-full rounded-md border bg-transparent px-3 py-2"
                    value={selectedDraft.caption}
                    onChange={(event) =>
                      patchSelectedDraft({ caption: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabelWithHint
                      htmlFor="draft-edit-hashtags"
                      label="Hashtags (space separated)"
                      hint={DRAFT_EDIT_HINTS.hashtags}
                    />
                    <div className="flex flex-wrap gap-2">
                      <FieldCharCounter
                        label="Tags"
                        current={selectedDraft.hashtags.length}
                        max={PLATFORM_KNOWLEDGE[selectedDraft.platform as Platform].hashtagLimits.max}
                      />
                      <FieldCharCounter
                        label="Hashtag text"
                        current={selectedDraft.hashtags.join(" ").length}
                        max={null}
                      />
                    </div>
                  </div>
                  <Input
                    id="draft-edit-hashtags"
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
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabelWithHint htmlFor="draft-edit-cta" label="CTA" hint={DRAFT_EDIT_HINTS.cta} />
                    <FieldCharCounter
                      current={selectedDraft.cta.length}
                      max={
                        selectedDraft.platform === "x"
                          ? 200
                          : selectedDraft.platform === "gbp"
                            ? 150
                            : 280
                      }
                    />
                  </div>
                  <Input
                    id="draft-edit-cta"
                    value={selectedDraft.cta}
                    onChange={(event) => patchSelectedDraft({ cta: event.target.value })}
                  />
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Live Preview ({PLATFORM_LABELS[selectedDraft.platform]})
                    </p>
                    <div className="flex gap-1.5">
                      {selectedDraft.mediaType && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            selectedDraft.mediaType === "video"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                              : selectedDraft.mediaType === "carousel"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {selectedDraft.mediaType}
                        </span>
                      )}
                      {selectedDraft.mediaUrls.some((url) =>
                        /\.(mp4|mov|avi|webm)$/i.test(url)
                      ) && (
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                          Video
                        </span>
                      )}
                    </div>
                  </div>
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
                  <button
                    type="button"
                    onClick={() => void saveVersionSnapshot()}
                    disabled={snapshotting || saving}
                    className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium disabled:opacity-50"
                  >
                    {snapshotting ? "Saving…" : "Snapshot to history"}
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

                {/* Cross-platform adaptation */}
                <div className="rounded-lg border border-dashed p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Adapt for another platform
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.filter((p) => p !== selectedDraft.platform).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!!adaptingTo}
                        onClick={() => void handleAdaptTo(p)}
                        className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                      >
                        {adaptingTo === p ? "Adapting..." : PLATFORM_LABELS[p]}
                      </button>
                    ))}
                  </div>
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

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Version history
                  </p>
                  <DraftVersionHistory
                    key={`${selectedDraft.id}-${selectedDraft.updatedAt}`}
                    draft={selectedDraft}
                    onDraftUpdated={(d) => {
                      setDrafts((current) => current.map((x) => (x.id === d.id ? d : x)));
                    }}
                  />
                </div>

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
