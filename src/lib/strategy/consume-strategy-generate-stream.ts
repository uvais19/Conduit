import type { ContentStrategy } from "@/lib/types";

export type StrategyGenerateDonePayload = {
  strategy: ContentStrategy;
  version: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One SSE message may include multiple `data:` lines; payloads are joined with `\n`.
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
function parseSseMessageBlock(block: string): { event: string; data: string } | null {
  let eventName = "";
  const dataLines: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trimStart();
    } else if (line.startsWith("data:")) {
      const payload = line.slice(5).trimStart();
      dataLines.push(payload);
    }
  }

  if (!eventName || dataLines.length === 0) return null;
  return { event: eventName, data: dataLines.join("\n") };
}

/**
 * Parse SSE from POST /api/strategy/generate (UTF-8 chunks, messages end with blank line).
 */
export async function consumeStrategyGenerateStream(
  response: Response,
  callbacks: {
    onProgress: (message: string) => void;
    onDone: (payload: StrategyGenerateDonePayload) => void;
  }
): Promise<{ doneReceived: boolean }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok && !contentType.includes("text/event-stream")) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Unable to generate strategy");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Unable to generate strategy");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let doneReceived = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Dispatch every complete SSE message (blank line terminates the message).
    while (true) {
      const m = /\r\n\r\n|\n\n/.exec(buffer);
      if (!m) break;

      const message = buffer.slice(0, m.index);
      buffer = buffer.slice(m.index + m[0].length);

      const parsed = parseSseMessageBlock(message);
      if (!parsed) continue;

      const data = JSON.parse(parsed.data) as Record<string, unknown>;
      if (parsed.event === "progress") {
        callbacks.onProgress((data.message as string) || "");
      } else if (parsed.event === "done") {
        const strat = data.strategy;
        if (isRecord(strat) && Array.isArray((strat as ContentStrategy).pillars)) {
          callbacks.onDone({
            strategy: strat as ContentStrategy,
            version:
              typeof data.version === "number" ? data.version : Number(data.version) || 0,
          });
          doneReceived = true;
        }
      } else if (parsed.event === "error") {
        throw new Error((data.error as string) || "Strategy generation failed");
      }
    }
  }

  return { doneReceived };
}

export async function fetchLatestStrategyFromApi(options?: {
  /** Extra GET attempts when the row is not visible yet (e.g. immediately after generate). */
  attempts?: number;
  delayMs?: number;
}): Promise<{
  strategy: ContentStrategy;
  version: number | null;
} | null> {
  const attempts = Math.max(1, options?.attempts ?? 1);
  const delayMs = Math.max(0, options?.delayMs ?? 0);

  for (let i = 0; i < attempts; i++) {
    const sync = await fetch("/api/strategy", { cache: "no-store" });
    if (!sync.ok) return null;
    const d = (await sync.json()) as {
      strategy?: ContentStrategy | null;
      version?: number | null;
    };
    if (
      d.strategy != null &&
      isRecord(d.strategy) &&
      Array.isArray((d.strategy as ContentStrategy).pillars)
    ) {
      return { strategy: d.strategy as ContentStrategy, version: d.version ?? null };
    }
    if (i < attempts - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}
