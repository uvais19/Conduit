"use client";

import { useEffect, useState } from "react";
import type { AuditEvent } from "@/lib/content/audit";

const ACTION_LABELS: Record<AuditEvent["action"], string> = {
  submit: "Submitted for review",
  approve: "Approved",
  revise: "Revision requested",
  edit: "Edited",
};

const ACTION_COLORS: Record<AuditEvent["action"], string> = {
  submit: "bg-blue-500",
  approve: "bg-green-500",
  revise: "bg-amber-500",
  edit: "bg-slate-400",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DraftTimeline({ draftId }: { draftId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/drafts/${draftId}/timeline`)
      .then((r) => r.json())
      .then((data) => {
        setEvents((data.events as AuditEvent[]) ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [draftId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading timeline...</p>;
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[21px] mt-1 h-3 w-3 rounded-full ring-2 ring-background ${ACTION_COLORS[event.action]}`}
          />
          <p className="text-sm font-medium leading-none">{ACTION_LABELS[event.action]}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {event.actorName} · {formatTime(event.timestamp)}
          </p>
          {event.notes && (
            <p className="mt-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
              {event.notes}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
