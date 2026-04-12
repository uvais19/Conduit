"use client";

import * as React from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  draft_ready: "bg-blue-500",
  draft_approved: "bg-emerald-500",
  revision_requested: "bg-amber-500",
  post_published: "bg-emerald-600",
  post_failed: "bg-red-500",
  analytics_summary: "bg-chart-1",
  optimization_proposal: "bg-purple-500",
  competitor_alert: "bg-orange-500",
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent fail
    }
  }, []);

  // Poll every 30s for new notifications
  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch when popover opens
  React.useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function handleMarkAllRead() {
    setLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setLoading(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[22rem] p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[24rem]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      !n.read
                        ? TYPE_COLORS[n.type] ?? "bg-primary"
                        : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.link && (
                        <a
                          href={n.link}
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          View <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Mark as read"
                    >
                      <Check className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
