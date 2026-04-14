"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ContentDraftRecord } from "@/lib/content/types";
import { PLATFORM_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [drafts, setDrafts] = useState<ContentDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [startAt, setStartAt] = useState("");
  const [intervalHours, setIntervalHours] = useState("24");
  const [scheduling, setScheduling] = useState(false);

  const [unassigned, setUnassigned] = useState<ContentDraftRecord[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setCampaign(data.campaign);
      setDrafts(data.drafts ?? []);
      setName(data.campaign.name);
      setDescription(data.campaign.description ?? "");
    } catch {
      toast.error("Failed to load campaign");
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUnassigned = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts?unassignedOnly=true");
      const data = await res.json();
      if (res.ok) setUnassigned(data.drafts ?? []);
    } catch {
      toast.error("Failed to load drafts");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (assignOpen) void loadUnassigned();
  }, [assignOpen, loadUnassigned]);

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setCampaign(data.campaign);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this campaign? Drafts stay in your workspace but are removed from the campaign.")) {
      return;
    }
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Campaign deleted");
      router.push("/content/campaigns");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleSchedule() {
    if (!startAt) {
      toast.error("Choose a start date and time");
      return;
    }
    const interval = Number(intervalHours);
    if (!Number.isFinite(interval) || interval < 1) {
      toast.error("Interval must be at least 1 hour");
      return;
    }
    const iso = new Date(startAt).toISOString();
    setScheduling(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: iso, intervalHours: interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      toast.success(`Scheduled ${data.updated} post(s)`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setScheduling(false);
    }
  }

  async function handleAssign() {
    if (selectedDraftIds.size === 0) {
      toast.error("Select at least one draft");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: Array.from(selectedDraftIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Assign failed");
      toast.success(`Added ${data.assigned} draft(s)`);
      setSelectedDraftIds(new Set());
      setAssignOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  function toggleDraft(draftId: string) {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  }

  const approvedCount = drafts.filter((d) => d.status === "approved").length;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Campaign not found.</p>
        <Link
          href="/content/campaigns"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/content/campaigns" className="hover:text-foreground">
              Campaigns
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{campaign.name}</span>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Campaign</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/content/generate?campaignId=${id}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            Generate into campaign
          </Link>
          <Button variant="destructive" type="button" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveMeta} className="flex max-w-lg flex-col gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" disabled={saving} size="sm" className="w-fit">
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Drafts in this campaign ({drafts.length})</CardTitle>
          <Button size="sm" type="button" onClick={() => setAssignOpen(true)}>
            Add existing drafts
          </Button>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No drafts yet. Use <strong>Generate into campaign</strong> or add existing drafts above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {drafts.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{PLATFORM_LABELS[d.platform]}</Badge>
                      <Badge variant="outline">{d.status}</Badge>
                      {d.variantLabel && (
                        <span className="text-xs text-muted-foreground">Variant {d.variantLabel}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{d.caption}</p>
                  </div>
                  <Link
                    href="/content/drafts"
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
                  >
                    Open drafts
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add drafts</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Select drafts that are not already in a campaign.
          </p>
          <div className="max-h-60 overflow-y-auto rounded-md border">
            {unassigned.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No unassigned drafts.</p>
            ) : (
              unassigned.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-start gap-2 border-b p-2 last:border-0 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedDraftIds.has(d.id)}
                    onChange={() => toggleDraft(d.id)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{PLATFORM_LABELS[d.platform]}</span> ·{" "}
                    {d.caption.slice(0, 80)}
                    {d.caption.length > 80 ? "…" : ""}
                  </span>
                </label>
              ))
            )}
          </div>
          <Button onClick={handleAssign} disabled={assigning}>
            {assigning ? "Adding…" : "Add to campaign"}
          </Button>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Batch schedule</CardTitle>
          <p className="text-muted-foreground text-sm">
            Schedules every <strong>approved</strong> draft in this campaign, oldest first, spaced by the
            interval. ({approvedCount} approved)
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="start-at">
              Start (local time)
            </label>
            <Input
              id="start-at"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="interval">
              Hours between posts
            </label>
            <Input
              id="interval"
              type="number"
              min={1}
              value={intervalHours}
              onChange={(e) => setIntervalHours(e.target.value)}
              className="w-28"
            />
          </div>
          <Button type="button" onClick={handleSchedule} disabled={scheduling || approvedCount === 0}>
            {scheduling ? "Scheduling…" : "Schedule approved drafts"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
