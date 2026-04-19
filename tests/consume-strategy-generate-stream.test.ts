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
  it("handles event and data split across chunks", async () => {
    const onDone = vi.fn();
    const res = sseResponse(["event: done\n", 'data: {"strategy":{"pillars":[{"name":"A","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"B","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"C","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"D","description":"d","percentage":20,"exampleTopics":["x"]},{"name":"E","description":"d","percentage":20,"exampleTopics":["x"]}]},"version":3}\n\n']);
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
});
