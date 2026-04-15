"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OptimizationProposal, ProposalStatus } from "@/lib/optimization/types";

const TYPE_LABELS: Record<string, string> = {
  pillar_change: "Content Pillar",
  schedule_change: "Schedule",
  tone_change: "Tone & Voice",
  format_change: "Format Mix",
};

const STATUS_VARIANT: Record<ProposalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

export default function OptimizePage() {
  const [proposals, setProposals] = useState<OptimizationProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");

  async function fetchProposals() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proposals");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load proposals");
      setProposals(data.proposals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }

  async function generateProposals() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/proposals", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate proposals");
      await fetchProposals();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate proposals");
    } finally {
      setGenerating(false);
    }
  }

  async function resolveProposal(
    id: string,
    action: "approved" | "rejected",
    operationId?: string
  ) {
    setResolving(operationId ? `${id}:${operationId}` : id);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, operationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resolve proposal");
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? data.proposal : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve proposal");
    } finally {
      setResolving(null);
    }
  }

  useEffect(() => {
    fetchProposals();
  }, []);

  const filtered =
    filter === "all" ? proposals : proposals.filter((p) => p.status === filter);

  const pendingCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Optimization Proposals
          </h1>
          <p className="text-muted-foreground">
            AI-generated improvement suggestions based on your analytics. Review
            and approve changes to your strategy.
          </p>
        </div>
        <Button onClick={generateProposals} disabled={generating}>
          {generating ? "Analyzing…" : "Generate Proposals"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "pending" && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {pendingCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">Loading proposals…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-muted-foreground">
              {proposals.length === 0
                ? "No proposals yet. Click 'Generate Proposals' to analyze your analytics and get optimization suggestions."
                : `No ${filter} proposals.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {proposal.title}
                      </CardTitle>
                      <Badge variant={STATUS_VARIANT[proposal.status]}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">
                        {TYPE_LABELS[proposal.proposalType] ??
                          proposal.proposalType}
                      </Badge>
                      <span>
                        Proposed{" "}
                        {new Date(proposal.proposedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {proposal.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveProposal(proposal.id, "approved")
                        }
                        disabled={resolving === proposal.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          resolveProposal(proposal.id, "rejected")
                        }
                        disabled={resolving === proposal.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{proposal.description}</p>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Reasoning
                  </p>
                  <p className="text-sm">{proposal.reasoning}</p>
                </div>
                {proposal.data.impactProjection ? (
                  <div className="rounded-md bg-muted p-3 text-xs">
                    <p className="mb-1 font-medium text-muted-foreground">
                      Projected impact
                    </p>
                    <p>
                      {proposal.data.impactProjection.metric}: baseline{" "}
                      {proposal.data.impactProjection.baseline.toFixed(2)} → projected{" "}
                      {proposal.data.impactProjection.projectedValue.toFixed(2)} (
                      {proposal.data.impactProjection.projectedDelta >= 0 ? "+" : ""}
                      {proposal.data.impactProjection.projectedDelta.toFixed(2)})
                    </p>
                    <p className="text-muted-foreground">
                      Confidence {(proposal.data.impactProjection.confidence * 100).toFixed(0)}% · Window{" "}
                      {proposal.data.impactProjection.evaluationWindowDays} days
                    </p>
                    <p className="text-muted-foreground">
                      Risk: {proposal.data.impactProjection.downsideRisk}
                    </p>
                  </div>
                ) : null}
                {proposal.data.operations.length > 0 ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Operation-level decisions
                    </p>
                    {proposal.data.operations.map((op) => (
                      <div key={op.id} className="rounded-md bg-muted p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {op.field}: {String(op.from ?? "—")} → {String(op.to ?? "—")}
                          </p>
                          <Badge variant={STATUS_VARIANT[op.status]}>
                            {op.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{op.reason}</p>
                        {proposal.status === "pending" && op.status === "pending" ? (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => resolveProposal(proposal.id, "approved", op.id)}
                              disabled={resolving === `${proposal.id}:${op.id}`}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveProposal(proposal.id, "rejected", op.id)}
                              disabled={resolving === `${proposal.id}:${op.id}`}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : proposal.data.legacyData && Object.keys(proposal.data.legacyData).length > 0 ? (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Legacy proposed changes
                    </p>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(proposal.data.legacyData, null, 2)}
                    </pre>
                  </div>
                ) : null}
                {proposal.resolvedAt && (
                  <p className="text-xs text-muted-foreground">
                    Resolved on{" "}
                    {new Date(proposal.resolvedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
