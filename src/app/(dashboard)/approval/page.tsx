"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { ContentDraftRecord } from "@/lib/content/types";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DraftTimeline } from "@/components/draft-timeline";
import { toast } from "sonner";
import {
  MessageSquare,
  ShieldCheck,
  Download,
  Trash2,
  Send,
} from "lucide-react";

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

const APPROVAL_FILTER_HINTS = {
  status: "Which step in the approval pipeline to show — from draft through published.",
  platform: "Filter the queue to a single social network or review everything at once.",
  pillar: "Match drafts whose strategy pillar contains this text (case-sensitive as typed).",
  sort: "Order of the list — by last edit, creation time, status, or platform name.",
} as const;

const APPROVAL_FORM_HINTS = {
  revisionNotes:
    "Concrete feedback for editors or AI: what to fix, tone issues, factual corrections, or sections to remove.",
  scheduleDate:
    "When this approved post should go live. Leave blank to let Conduit pick an optimal slot from your strategy.",
} as const;

const REVISION_TEMPLATES = [
  { label: "Tone too formal", text: "The tone feels too formal for this platform. Please make it more conversational and relatable." },
  { label: "Needs stronger CTA", text: "The call-to-action is too weak. Please add a clear, compelling CTA that drives the desired action." },
  { label: "Off-brand messaging", text: "This doesn't align with our brand voice. Please revise to match our tone guidelines." },
  { label: "Too long", text: "The caption is too long for optimal engagement on this platform. Please trim to key points." },
  { label: "Missing hashtags", text: "Please add relevant, trending hashtags appropriate for this platform and audience." },
  { label: "Factual correction", text: "There are factual inaccuracies that need to be corrected before publishing." },
];

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
  const [aiRevising, setAiRevising] = useState(false);
  const [aiRevision, setAiRevision] = useState<{
    revisedCaption: string;
    revisedHashtags: string[];
    revisedCta: string;
    changesSummary: string;
    changesApplied: Array<{ what: string; why: string }>;
  } | null>(null);

  // Comment thread state
  const [comments, setComments] = useState<
    Array<{
      id: string;
      content: string;
      createdAt: string;
      userName?: string;
      userAvatar?: string;
      parentId?: string;
    }>
  >([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Brand check state
  const [brandCheck, setBrandCheck] = useState<{
    overallScore: number;
    toneScore: number;
    messageAlignmentScore: number;
    guidelinesScore: number;
    issues: Array<{ severity: string; category: string; message: string; suggestion: string }>;
    strengths: string[];
    summary: string;
  } | null>(null);
  const [brandChecking, setBrandChecking] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

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

  async function handleAiRevise() {
    if (!selectedDraft) return;
    setAiRevising(true);
    setAiRevision(null);
    setError("");
    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}/ai-revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNotes || "Improve this content based on platform best practices" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to generate AI revision");
      setAiRevision(data.revision);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate AI revision");
    } finally {
      setAiRevising(false);
    }
  }

  async function applyAiRevision() {
    if (!selectedDraft || !aiRevision) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/drafts/${selectedDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: aiRevision.revisedCaption,
          hashtags: aiRevision.revisedHashtags,
          cta: aiRevision.revisedCta,
          status: "in-review",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to apply revision");

      const updated = data.draft as ContentDraftRecord;
      setDrafts((current) =>
        current.map((d) => (d.id === updated.id ? updated : d))
      );
      setAiRevision(null);
      setNotice("AI revision applied. Draft moved back to review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to apply revision");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Comment thread functions ──────────────────────────────
  async function loadComments(draftId: string) {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/drafts/comments?draftId=${draftId}`);
      const data = await res.json();
      if (res.ok) setComments(data.comments ?? []);
    } catch {
      // Silently fail — comments are non-critical
    } finally {
      setCommentsLoading(false);
    }
  }

  async function postComment() {
    if (!selectedDraft || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch("/api/drafts/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: selectedDraft.id, content: commentText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setCommentText("");
      await loadComments(selectedDraft.id);
      toast.success("Comment added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await fetch("/api/drafts/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (selectedDraft) await loadComments(selectedDraft.id);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  // Load comments when selected draft changes
  useEffect(() => {
    if (selectedId) void loadComments(selectedId);
    setBrandCheck(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Brand consistency check ───────────────────────────────
  async function handleBrandCheck() {
    if (!selectedDraft) return;
    setBrandChecking(true);
    setBrandCheck(null);
    try {
      const res = await fetch("/api/brand/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: selectedDraft.caption,
          hashtags: selectedDraft.hashtags,
          cta: selectedDraft.cta,
          platform: selectedDraft.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Brand check failed");
      setBrandCheck(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Brand check failed");
    } finally {
      setBrandChecking(false);
    }
  }

  // ── Bulk operations ───────────────────────────────────────
  function toggleBulkSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAction(action: "approve" | "submit" | "delete") {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/content/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: Array.from(selectedIds), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk action failed");
      toast.success(`${action} applied to ${selectedIds.size} drafts`);
      setSelectedIds(new Set());
      await fetchDrafts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Export drafts ─────────────────────────────────────────
  async function handleExportDrafts() {
    try {
      const res = await fetch("/api/content/export?format=csv");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "drafts-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Drafts exported as CSV");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="animate-pulse-dot" />
              Review Queue
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Approval Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review, approve, or request revisions on content drafts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void handleBulkAction("approve")}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50 shadow-sm transition-all hover:opacity-90"
              >
                Bulk Approve
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void handleBulkAction("delete")}
                className="inline-flex h-8 items-center rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-50 transition-all hover:opacity-90"
              >
                Bulk Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleExportDrafts()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </header>

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
      <div className="rounded-xl border border-border/80 bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters &amp; Sort</p>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="approval-filter-status"
              label="Status"
              hint={APPROVAL_FILTER_HINTS.status}
            />
            <select
              id="approval-filter-status"
              className="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm hover:bg-muted/30 transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="approval-filter-platform"
              label="Platform"
              hint={APPROVAL_FILTER_HINTS.platform}
            />
            <select
              id="approval-filter-platform"
              className="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm hover:bg-muted/30 transition-colors"
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
          </div>

          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="approval-filter-pillar"
              label="Pillar"
              hint={APPROVAL_FILTER_HINTS.pillar}
            />
            <Input
              id="approval-filter-pillar"
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              placeholder="Filter by pillar"
            />
          </div>

          <div className="space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="approval-filter-sort"
              label="Sort by"
              hint={APPROVAL_FILTER_HINTS.sort}
            />
            <select
              id="approval-filter-sort"
              className="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm hover:bg-muted/30 transition-colors"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="updatedAt">Last updated</option>
              <option value="createdAt">Created date</option>
              <option value="status">Status</option>
              <option value="platform">Platform</option>
            </select>
          </div>
        </div>
      </div>

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
                <div key={draft.id} className="flex items-start gap-1.5">
                  <input
                    type="checkbox"
                    className="mt-3 size-3.5 rounded"
                    checked={selectedIds.has(draft.id)}
                    onChange={() => toggleBulkSelect(draft.id)}
                  />
                  <button
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
                </div>
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
                      {/* Revision templates */}
                      <div className="flex flex-wrap gap-1">
                        {REVISION_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.label}
                            type="button"
                            onClick={() => setRevisionNotes(tpl.text)}
                            className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                      <div className="block space-y-2 text-sm">
                        <FieldLabelWithHint
                          htmlFor="approval-revision-notes"
                          label="Revision notes"
                          hint={APPROVAL_FORM_HINTS.revisionNotes}
                        />
                        <textarea
                          id="approval-revision-notes"
                          className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                          placeholder="Describe what needs to change..."
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                        />
                      </div>
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

                  {/* AI Revise — shown when draft has revision-requested status */}
                  {selectedDraft.status === "revision-requested" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={aiRevising || actionLoading}
                          onClick={() => void handleAiRevise()}
                          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {aiRevising ? "AI Revising..." : "AI Revise"}
                        </button>
                      </div>

                      {aiRevision && (
                        <div className="space-y-3 rounded-md border p-3">
                          <p className="text-sm font-medium">AI Revision Preview</p>
                          <p className="text-xs text-muted-foreground">{aiRevision.changesSummary}</p>

                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Revised Caption</p>
                            <p className="whitespace-pre-wrap text-sm">{aiRevision.revisedCaption}</p>
                          </div>

                          {aiRevision.revisedHashtags.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Revised Hashtags</p>
                              <p className="text-sm text-muted-foreground">{aiRevision.revisedHashtags.join(" ")}</p>
                            </div>
                          )}

                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Revised CTA</p>
                            <p className="text-sm">{aiRevision.revisedCta}</p>
                          </div>

                          {aiRevision.changesApplied.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Changes Applied</p>
                              <ul className="space-y-1">
                                {aiRevision.changesApplied.map((change, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{change.what}:</span> {change.why}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => void applyAiRevision()}
                              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            >
                              Apply Revision
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiRevision(null)}
                              className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
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
                      <div className="block space-y-2 text-sm">
                        <FieldLabelWithHint
                          htmlFor="approval-schedule-datetime"
                          label="Schedule date & time"
                          hint={APPROVAL_FORM_HINTS.scheduleDate}
                        />
                        <input
                          id="approval-schedule-datetime"
                          type="datetime-local"
                          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to use AI-suggested optimal time.
                        </p>
                      </div>
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

              {/* Brand Consistency Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Brand Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    disabled={brandChecking}
                    onClick={() => void handleBrandCheck()}
                    className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {brandChecking ? "Checking..." : "Run Brand Check"}
                  </button>
                  {brandCheck && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            brandCheck.overallScore >= 70
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : brandCheck.overallScore >= 40
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {brandCheck.overallScore}/100
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Tone: {brandCheck.toneScore} · Message: {brandCheck.messageAlignmentScore} · Guidelines: {brandCheck.guidelinesScore}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{brandCheck.summary}</p>
                      {brandCheck.issues.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issues</p>
                          {brandCheck.issues.map((issue, i) => (
                            <div key={i} className="rounded-md border p-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={issue.severity === "high" ? "destructive" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {issue.severity}
                                </Badge>
                                <span className="font-medium">{issue.category}</span>
                              </div>
                              <p className="mt-1 text-muted-foreground">{issue.message}</p>
                              <p className="mt-0.5 text-primary">{issue.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {brandCheck.strengths.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strengths</p>
                          {brandCheck.strengths.map((s, i) => (
                            <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400">✓ {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comment Threads */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" />
                    Comments
                    {comments.length > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({comments.length})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {commentsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet. Be the first to leave feedback.</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((comment) => (
                        <div key={comment.id} className="group flex gap-2 rounded-md border p-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {(comment.userName ?? "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{comment.userName ?? "User"}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm whitespace-pre-wrap">{comment.content}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void deleteComment(comment.id)}
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      placeholder="Add a comment..."
                      className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void postComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={postingComment || !commentText.trim()}
                      onClick={() => void postComment()}
                      className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
