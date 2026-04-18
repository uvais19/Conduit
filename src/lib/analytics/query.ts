import type { Platform } from "@/lib/types";
import type { AnalyticsQuery } from "@/lib/analytics/types";

const VALID_PLATFORMS = new Set<Platform>([
  "instagram",
  "facebook",
  "linkedin",
]);

export function parseAnalyticsQueryFromUrl(url: URL): AnalyticsQuery {
  const from = normalizeDateParam(url.searchParams.get("from"));
  const to = normalizeDateParam(url.searchParams.get("to"));
  const platforms = parsePlatforms(url.searchParams.get("platforms"));

  return {
    from: from ?? undefined,
    to: to ?? undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
  };
}

function normalizeDateParam(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function parsePlatforms(raw: string | null): Platform[] {
  if (!raw) return [];
  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = new Set<Platform>();
  for (const value of values) {
    if (VALID_PLATFORMS.has(value as Platform)) {
      unique.add(value as Platform);
    }
  }
  return Array.from(unique);
}
