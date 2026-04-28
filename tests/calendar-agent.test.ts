import { describe, expect, it, vi } from "vitest";
import { createEmptyBrandManifesto } from "@/lib/brand/manifesto";
import { runCalendarAgent } from "@/lib/agents/calendar/calendar-agent";
import { createDefaultStrategy } from "@/lib/strategy/defaults";

vi.mock("@/lib/ai/clients", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/clients")>(
    "@/lib/ai/clients"
  );
  return {
    ...actual,
    generateJsonStructured: vi.fn(),
    resolveGeminiModel: vi.fn(() => "gemini-3.0-flash-high"),
    resolveGeminiThinking: vi.fn(() => ({ thinkingLevel: "high" })),
  };
});

describe("calendar agent", () => {
  it("falls back to deterministic month plan when model output is invalid", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-04",
      timezone: "UTC",
      items: [],
    } as never);

    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });
    const result = await runCalendarAgent({
      strategy,
      manifesto,
      month: "2026-04",
      timezone: "UTC",
    });

    expect(result.month).toBe("2026-04");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.idea.length).toBeGreaterThan(0);
  });

  it("rejects partial model plans and keeps month/timezone defaults", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-04",
      timezone: "UTC",
      items: [
        {
          id: "linkedin-2026-04-01-1",
          date: "2026-04-01",
          platform: "linkedin",
          pillar: strategy.pillars[0]!.name,
          idea: "Share a practical framework tied to onboarding outcomes.",
          contentType: "text-only",
        },
      ],
    } as never);

    const result = await runCalendarAgent({
      strategy,
      manifesto,
      month: "2026-04",
      timezone: "UTC",
    });

    expect(result.month).toBe("2026-04");
    expect(result.timezone).toBe("UTC");
    expect(result.items.length).toBeGreaterThan(1);
  });
});
