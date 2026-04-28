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
      month: "2026-04-01",
      timezone: "UTC",
    });

    expect(result.month).toBe("2026-04-01");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.idea.length).toBeGreaterThan(0);
  });

  it("rejects partial model plans and keeps month/timezone defaults", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-04-01",
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
      month: "2026-04-01",
      timezone: "UTC",
    });

    expect(result.month).toBe("2026-04-01");
    expect(result.timezone).toBe("UTC");
    expect(result.items.length).toBeGreaterThan(1);
  });

  it("falls back when model returns duplicate slot ids instead of full slot set", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    const duplicateItem = {
      id: "linkedin-2026-01-31-1",
      date: "2026-01-31",
      platform: "linkedin",
      pillar: strategy.pillars[0]!.name,
      idea: "Duplicate slot item to simulate invalid model output shape.",
      contentType: "text-only",
    };

    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-01-31",
      timezone: "UTC",
      items: [duplicateItem, { ...duplicateItem }],
    } as never);

    const result = await runCalendarAgent({
      strategy,
      manifesto,
      month: "2026-01-31",
      timezone: "UTC",
    });

    expect(result.month).toBe("2026-01-31");
    expect(result.timezone).toBe("UTC");
    expect(result.items.length).toBeGreaterThan(2);
    expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
  });

  it("builds a clamped one-month window for month-end starts", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-01-31",
      timezone: "UTC",
      items: [],
    } as never);

    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });
    const result = await runCalendarAgent({
      strategy,
      manifesto,
      month: "2026-01-31",
      timezone: "UTC",
    });

    const dates = result.items.map((item) => item.date);
    expect(dates.some((date) => date < "2026-01-31")).toBe(false);
    expect(dates.some((date) => date.startsWith("2026-02"))).toBe(true);
    expect(dates.some((date) => date > "2026-02-28")).toBe(false);
  });

  it("always rebuilds execution notes from strategy schedule", async () => {
    const { generateJsonStructured } = await import("@/lib/ai/clients");
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    vi.mocked(generateJsonStructured).mockResolvedValueOnce({
      month: "2026-04-01",
      timezone: "UTC",
      items: [
        {
          id: "linkedin-2026-04-01-1",
          date: "2026-04-01",
          platform: "linkedin",
          pillar: strategy.pillars[0]!.name,
          idea: "Lead with one practical insight from this week's strategic theme.",
          contentType: "text-only",
          notes: "model generated note that should be replaced",
        },
      ],
    } as never);

    const result = await runCalendarAgent({
      strategy,
      manifesto,
      month: "2026-04-01",
      timezone: "UTC",
    });

    expect(result.items[0]?.notes).not.toContain("model generated note");
    expect(result.items[0]?.notes).toContain("cadence from strategy");
  });
});
