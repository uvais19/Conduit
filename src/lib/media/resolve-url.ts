/**
 * Turns stored draft media URLs into a browser-usable src.
 * `local-preview://` keys are served by `/api/media/local/...` after files are written to disk.
 */
export function resolveDraftMediaSrc(url: string): string {
  if (url.startsWith("local-preview://")) {
    const key = url.slice("local-preview://".length).replace(/^\/+/, "");
    if (!key) return url;
    // Query param avoids `.svg` (etc.) in the pathname so Clerk proxy runs on this URL.
    return `/api/media/local?key=${encodeURIComponent(key)}`;
  }
  return url;
}
