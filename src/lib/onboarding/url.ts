/**
 * Canonical onboarding website URL for requests and prefill cache keys.
 * Trims input, adds https when missing, lowercases host, strips hash, and
 * removes a trailing slash on non-root paths.
 */
export function normalizeOnboardingWebsiteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase();
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    const protocol = u.protocol.toLowerCase() === "http:" ? "http:" : "https:";
    return `${protocol}//${host}${path}`;
  } catch {
    return withScheme;
  }
}
