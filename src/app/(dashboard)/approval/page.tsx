"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DraftTimeline } from "@/components/draft-timeline";

const STATUS_OPTIONS: Array<{ value: "all" | ContentDraftRecord["status"]; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "in-review", label: "In review" },
  { value: "revision-requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

const STATUS_BADGE: Record<ContentDraftRecord["status"], string> = {
  "draft": "secondary",
  "in-review": "default",
  "revision-requested": "destructive",
  "approved": "outline",
  "scheduled": "secondary",
  "published": "secondary",
  "failed": "destructive",
};

type SortKey = "createdAt" | "updatedAt" | "status" | "platform";

export default function ApprovalPage() {
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | ContentDraftRecord["status"]>("in-review");
  const [platformFilter, setPlatformFilter] = useState<"all" | (typeof PLATFORMS)[number]>("all");
  const [pillarFilter, setPillarFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");

  const selectedDraft = useMemo(
    () => drafts.find((d) => d.id === selectedId) ?? null,
    [drafts, selectedId]
  );

  async function fetchDrafts() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (pillarFilter.trim()) params.set("pillar", pillarFilter.trim());

      const response = await fetch(`/api/drafts?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load drafts");

      const next = data.drafts as ContentDraftRecord[];
      setDrafts(next);
      if (!next.find((d) => d.id === selectedId)) {
        setSelectedId(next[0]?.id ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, platformFilter, pillarFilter]);

  const sortedDrafts = useMemo(() => {
    return [...drafts].sort((a, b) => {
      if (sortKey === "createdAt" || sortKey === "updatedAt") {
        return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
      }
      return (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
    });
  }, [drafts, sortKey]);

  async function performAction(action: "approve" | "revise", notes = "") {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Unable to ${action}`);

      const updated = data.draft as ContentDraftRecord;
      setDrafts((current) =>
        current.map((d) => (d.id === updated.id ? updated : d))
      );
      setShowRevisionForm(false);
      setRevisionNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : `Unable to ${action}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSchedule() {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const body: Record<string, string> = {};
      if (scheduleDate) body.scheduledAt = new Date(scheduleDate).toISOString();

      const response = await fetch(`/api/drafts/${selectedDraft.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to schedule");

      const updated = data.draft as ContentDraftRecord;
      setDrafts((current) =>
        current.map((d) => (d.id === updated.id ? updated : d))
      );
      setShowScheduleForm(false);
      setScheduleDate("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to schedule");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to publish");

      const updated = data.draft as ContentDraftRecord;
      setDrafts((current) =>
        current.map((d) => (d.id === updated.id ? updated : d))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to publish");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCollectAnalytics() {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: selectedDraft.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to collect analytics");
      setNotice(data.message ?? "Analytics collected successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to collect analytics");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review, approve, or request revisions on content drafts.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {notice}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Sort</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2 text-sm">
            Status
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            Platform
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
            >
              <option value="all">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            Pillar
            <Input
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              placeholder="Filter by pillar"
            />
          </label>

          <label className="space-y-2 text-sm">
            Sort by
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="updatedAt">Last updated</option>
              <option value="createdAt">Created date</option>
              <option value="status">Status</option>
              <option value="platform">Platform</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Draft list */}
        <Card>
          <CardHeader>
            <CardTitle>
              Drafts
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sortedDrafts.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : sortedDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts found.</p>
            ) : (
              sortedDrafts.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(draft.id);
                    setShowRevisionForm(false);
                    setRevisionNotes("");
                  }}
                  className={`w-full rounded-md border p-2 text-left text-sm transition-colors hover:bg-muted/40 ${
                    selectedId === draft.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {draft.variantLabel} · {PLATFORM_LABELS[draft.platform]}
                    </span>
                    <Badge variant={STATUS_BADGE[draft.status] as "default" | "secondary" | "destructive" | "outline"}>
                      {draft.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{draft.pillar}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {new Date(draft.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detail + action panel */}
        <div className="space-y-4">
          {!selectedDraft ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Select a draft to review.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      {selectedDraft.variantLabel} · {PLATFORM_LABELS[selectedDraft.platform]}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedDraft.pillar}</p>
                  </div>
                  <Badge
                    variant={STATUS_BADGE[selectedDraft.status] as "default" | "secondary" | "destructive" | "outline"}
                    className="shrink-0"
                  >
                    {selectedDraft.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Caption
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{selectedDraft.caption}</p>
                  </div>

                  {selectedDraft.hashtags.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Hashtags
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDraft.hashtags.join(" ")}
                      </p>
                    </div>
                  )}

                  {selectedDraft.cta && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        CTA
                      </p>
                      <p className="text-sm">{selectedDraft.cta}</p>
                    </div>
                  )}

                  {/* Action buttons — only shown when draft is in-review */}
                  {selectedDraft.status === "in-review" && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void performAction("approve")}
                        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {actionLoading ? "Processing..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setShowRevisionForm((v) => !v)}
                        className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium disabled:opacity-50"
                      >
                        Request Revision
                      </button>
                    </div>
                  )}

                  {showRevisionForm && (
                    <div className="space-y-2 rounded-md border p-3">
                      <label className="block space-y-1 text-sm">
                        <span className="font-medium">Revision notes</span>
                        <textarea
                          className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                          placeholder="Describe what needs to change..."
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionLoading || !revisionNotes.trim()}
                          onClick={() => void performAction("revise", revisionNotes)}
                          className="inline-flex h-8 items-center rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground disabled:opacity-50"
                        >
                          Send revision request
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRevisionForm(false);
                            setRevisionNotes("");
                          }}
                          className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Schedule — shown when draft is approved */}
                  {selectedDraft.status === "approved" && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setShowScheduleForm((v) => !v)}
                        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handlePublish()}
                        className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading ? "Publishing..." : "Publish Now"}
                      </button>
                    </div>
                  )}

                  {showScheduleForm && selectedDraft.status === "approved" && (
                    <div className="space-y-2 rounded-md border p-3">
                      <label className="block space-y-1 text-sm">
                        <span className="font-medium">Schedule date & time</span>
                        <input
                          type="datetime-local"
                          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to use AI-suggested optimal time.
                        </p>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleSchedule()}
                          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {actionLoading ? "Scheduling..." : "Confirm Schedule"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowScheduleForm(false);
                            setScheduleDate("");
                          }}
                          className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Publish — shown when draft is scheduled */}
                  {selectedDraft.status === "scheduled" && (
                    <div className="space-y-2 pt-2">
                      {selectedDraft.scheduledAt && (
                        <p className="text-sm text-muted-foreground">
                          Scheduled for {new Date(selectedDraft.scheduledAt).toLocaleString()}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handlePublish()}
                        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {actionLoading ? "Publishing..." : "Publish Now"}
                      </button>
                    </div>
                  )}

                  {/* Published info */}
                  {selectedDraft.status === "published" && selectedDraft.platformPostId && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-sm font-medium">Published</p>
                      <p className="text-xs text-muted-foreground">
                        Post ID: {selectedDraft.platformPostId}
                      </p>
                      {selectedDraft.publishedAt && (
                        <p className="text-xs text-muted-foreground">
                          Published at {new Date(selectedDraft.publishedAt).toLocaleString()}
                        </p>
                      )}
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleCollectAnalytics()}
                          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading ? "Collecting..." : "Collect Analytics"}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <DraftTimeline draftId={selectedDraft.id} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
