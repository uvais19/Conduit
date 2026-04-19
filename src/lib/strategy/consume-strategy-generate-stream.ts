import type { ContentStrategy } from "@/lib/types";

export type StrategyGenerateDonePayload = {
  strategy: ContentStrategy;
  version: number;
};

/**
 * Parse SSE from POST /api/strategy/generate (event + data lines, UTF-8 chunks).
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
  let currentEvent = "";
  let doneReceived = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = line.replace(/\r$/, "");
      if (trimmedLine.startsWith("event: ")) {
        currentEvent = trimmedLine.slice(7).trim();
      } else if (trimmedLine.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(trimmedLine.slice(6).trim()) as Record<string, unknown>;
          if (currentEvent === "progress") {
            callbacks.onProgress((data.message as string) || "");
          } else if (currentEvent === "done") {
            const strat = data.strategy;
            if (
              strat &&
              typeof strat === "object" &&
              Array.isArray((strat as ContentStrategy).pillars) &&
              (strat as ContentStrategy).pillars.length > 0
            ) {
              callbacks.onDone({
                strategy: strat as ContentStrategy,
                version:
                  typeof data.version === "number"
                    ? data.version
                    : Number(data.version) || 0,
              });
              doneReceived = true;
            }
          } else if (currentEvent === "error") {
            throw new Error((data.error as string) || "Strategy generation failed");
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
            throw parseError;
          }
        }
        currentEvent = "";
      }
    }
  }

  return { doneReceived };
}

export async function fetchLatestStrategyFromApi(): Promise<{
  strategy: ContentStrategy;
  version: number | null;
} | null> {
  const sync = await fetch("/api/strategy", { cache: "no-store" });
  if (!sync.ok) return null;
  const d = (await sync.json()) as {
    strategy?: ContentStrategy | null;
    version?: number | null;
  };
  if (d.strategy && Array.isArray(d.strategy.pillars) && d.strategy.pillars.length > 0) {
    return { strategy: d.strategy, version: d.version ?? null };
  }
  return null;
}
