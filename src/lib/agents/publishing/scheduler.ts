/**
 * Scheduler Agent
 *
 * Manages a publish queue of scheduled drafts.
 * Determines optimal posting times per platform, checks for due items,
 * and triggers the Publisher Agent. Supports retry logic for failures.
 */

import type { Platform } from "@/lib/types";
import { getBestPostingWindows } from "@/lib/analytics/store";

// ---------------------------------------------------------------------------
// Optimal posting windows (simplified heuristics)
// ---------------------------------------------------------------------------

/** Returns suggested hour (0–23) for a platform based on general best practices */
const OPTIMAL_HOURS: Record<Platform, number[]> = {
  instagram: [9, 12, 17],   // Morning, lunch, evening
  facebook:  [9, 13, 16],
  linkedin:  [8, 10, 17],   // Business hours
};

export function suggestPostingTime(platform: Platform, afterDate?: Date): Date {
  const base = afterDate ? new Date(afterDate) : new Date();
  const hours = OPTIMAL_HOURS[platform];

  // Find the next available optimal hour
  for (const hour of hours) {
    const candidate = new Date(base);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate > new Date()) {
      return candidate;
    }
  }

  // All hours have passed today — pick first optimal hour tomorrow
  const tomorrow = new Date(base);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours[0], 0, 0, 0);
  return tomorrow;
}

/**
 * Learns best posting windows from historical engagement and falls back to defaults.
 */
export async function suggestPostingTimeFromHistory(
  tenantId: string,
  platform: Platform,
  afterDate?: Date
): Promise<Date> {
  const windows = await getBestPostingWindows(tenantId, { platforms: [platform] });
  if (windows.length === 0 || windows[0].sampleSize < 3) {
    return suggestPostingTime(platform, afterDate);
  }

  const base = afterDate ? new Date(afterDate) : new Date();
  const ranked = windows.filter((window) => window.sampleSize >= 3);
  for (let offset = 0; offset < 14; offset += 1) {
    const day = new Date(base);
    day.setDate(base.getDate() + offset);
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()];
    const sameDay = ranked
      .filter((window) => window.weekday === weekday)
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
    const choice = sameDay[0] ?? ranked[0];
    if (!choice) break;
    const candidate = new Date(day);
    candidate.setHours(choice.hour, 0, 0, 0);
    if (candidate > new Date()) {
      return candidate;
    }
  }

  return suggestPostingTime(platform, afterDate);
}

// ---------------------------------------------------------------------------
// Schedule queue (in-memory)
// ---------------------------------------------------------------------------

export type ScheduledItem = {
  draftId: string;
  tenantId: string;
  platform: Platform;
  scheduledAt: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
};

const scheduleQueue = new Map<string, ScheduledItem>(); // keyed by draftId

export function enqueue(item: Omit<ScheduledItem, "retryCount" | "maxRetries" | "lastError">): ScheduledItem {
  const entry: ScheduledItem = {
    ...item,
    retryCount: 0,
    maxRetries: 3,
    lastError: "",
  };
  scheduleQueue.set(item.draftId, entry);
  return entry;
}

export function dequeue(draftId: string): boolean {
  return scheduleQueue.delete(draftId);
}

export function getScheduledItem(draftId: string): ScheduledItem | null {
  return scheduleQueue.get(draftId) ?? null;
}

export function listDueItems(): ScheduledItem[] {
  const now = new Date();
  const due: ScheduledItem[] = [];
  for (const item of scheduleQueue.values()) {
    if (new Date(item.scheduledAt) <= now) {
      due.push(item);
    }
  }
  return due;
}

export function listScheduledItems(tenantId: string): ScheduledItem[] {
  const items: ScheduledItem[] = [];
  for (const item of scheduleQueue.values()) {
    if (item.tenantId === tenantId) items.push(item);
  }
  return items;
}

export function recordRetry(draftId: string, errorMessage: string): ScheduledItem | null {
  const item = scheduleQueue.get(draftId);
  if (!item) return null;

  item.retryCount += 1;
  item.lastError = errorMessage;

  // Exponential backoff: reschedule 5min, 15min, 45min
  const delayMinutes = 5 * Math.pow(3, item.retryCount - 1);
  const nextAttempt = new Date(Date.now() + delayMinutes * 60_000);
  item.scheduledAt = nextAttempt.toISOString();

  scheduleQueue.set(draftId, item);
  return item;
}

export function hasExceededRetries(draftId: string): boolean {
  const item = scheduleQueue.get(draftId);
  if (!item) return false;
  return item.retryCount >= item.maxRetries;
}
