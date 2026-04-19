import { describe, expect, it, vi } from "vitest";
import { consumeStrategyGenerateStream } from "@/lib/strategy/consume-strategy-generate-stream";
import type { ContentStrategy } from "@/lib/types";

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("consumeStrategyGenerateStream", () => {
  const fivePillarsJson =
    '{"strategy":{"pillars":[{"name":"A","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"B","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"C","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"D","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"E","description":"d","percentage":20,"exampleTopics":["x"]}]},"version":3}';

  it("handles event and data split across chunks (no space after data:, matching the API route)", async () => {
    const onDone = vi.fn();
    // Mirrors src/app/api/strategy/generate/route.ts: `data: ${JSON.stringify(data)}` — no space before `{`.
    const res = sseResponse(["event: done\n", `data:${fivePillarsJson}\n\n`]);
    const { doneReceived } = await consumeStrategyGenerateStream(res, {
      onProgress: () => {},
      onDone,
    });
    expect(doneReceived).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    const arg = onDone.mock.calls[0][0] as { strategy: ContentStrategy; version: number };
    expect(arg.strategy.pillars).toHaveLength(5);
    expect(arg.strategy.pillars[0].name).toBe("A");
    expect(arg.version).toBe(3);
  });

  it("parses CRLF-framed SSE and multiple messages in one chunk", async () => {
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const body =
      `event: progress\r\ndata:{"message":"a"}\r\n\r\n` +
      `event: progress\r\ndata:{"message":"b"}\r\n\r\n` +
      `event: done\r\ndata:${fivePillarsJson}\r\n\r\n`;
    const res = sseResponse([body]);
    const { doneReceived } = await consumeStrategyGenerateStream(res, {
      onProgress,
      onDone,
    });
    expect(doneReceived).toBe(true);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("invokes onDone when pillars array is present but empty (server contract)", async () => {
    const onDone = vi.fn();
    const res = sseResponse([`event: done\ndata:{"strategy":{"pillars":[]},"version":1}\n\n`]);
    const { doneReceived } = await consumeStrategyGenerateStream(res, {
      onProgress: () => {},
      onDone,
    });
    expect(doneReceived).toBe(true);
    expect(onDone.mock.calls[0][0].strategy.pillars).toEqual([]);
  });

  it("accepts SSE data lines with a space after data: (spec form)", async () => {
    const onDone = vi.fn();
    const res = sseResponse([`event: done\ndata: ` + fivePillarsJson + "\n\n"]);
    const { doneReceived } = await consumeStrategyGenerateStream(res, {
      onProgress: () => {},
      onDone,
    });
    expect(doneReceived).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("splits terminator across read chunks", async () => {
    const onDone = vi.fn();
    const line = `event: done\ndata:${fivePillarsJson}\n`;
    const res = sseResponse([line.slice(0, 12), line.slice(12), "\n"]);
    const { doneReceived } = await consumeStrategyGenerateStream(res, {
      onProgress: () => {},
      onDone,
    });
    expect(doneReceived).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
