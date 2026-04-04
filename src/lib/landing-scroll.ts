/** Slower in-page scroll for landing nav; honors scroll-margin on the target (e.g. scroll-mt-20). */

const DURATION_MS = 1500;

let scrollToken = 0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clampScrollY(y: number): number {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, y), max);
}

export function scrollToLandingSection(elementId: string): void {
  if (typeof window === "undefined") return;

  const el = document.getElementById(elementId);
  if (!el) return;

  scrollToken += 1;
  const token = scrollToken;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const rect = el.getBoundingClientRect();
  const targetY = clampScrollY(window.scrollY + rect.top - marginTop);

  if (reduce) {
    window.scrollTo(0, targetY);
    history.replaceState(null, "", `#${elementId}`);
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 0.5) {
    history.replaceState(null, "", `#${elementId}`);
    return;
  }

  let startTime: number | null = null;

  function step(now: number) {
    if (token !== scrollToken) return;
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const eased = easeInOutCubic(t);
    window.scrollTo(0, startY + distance * eased);
    if (t < 1) {
      requestAnimationFrame(step);
    } else if (token === scrollToken) {
      window.scrollTo(0, targetY);
      history.replaceState(null, "", `#${elementId}`);
    }
  }

  requestAnimationFrame(step);
}
