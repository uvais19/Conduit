import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyBrandManifesto } from "@/lib/brand/manifesto";
import { createDefaultStrategy } from "@/lib/strategy/defaults";

const selectQueue: unknown[][] = [];
const dbMock = {
  select: vi.fn(() => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => selectQueue.shift() ?? [],
        }),
      }),
    }),
  })),
  update: vi.fn(() => ({
    set: () => ({
      where: async () => [],
    }),
  })),
  insert: vi.fn(() => ({
    values: () => ({
      returning: async () => selectQueue.shift() ?? [],
    }),
  })),
};

vi.mock("@/lib/auth/permissions", () => ({
  requireAuth: vi.fn(async () => ({ user: { tenantId: "tenant-1" } })),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("@/lib/agents/calendar", () => ({
  runCalendarAgent: vi.fn(),
}));

describe("POST /api/calendar/generate", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    dbMock.select.mockClear();
    dbMock.update.mockClear();
    dbMock.insert.mockClear();
  });

  it("returns existing plan when present and not forced", async () => {
    const existing = {
      id: "plan-1",
      data: { month: "2026-04", timezone: "UTC", items: [] },
    };
    selectQueue.push([existing]);

    const { POST } = await import("@/app/api/calendar/generate/route");
    const res = await POST(
      new Request("http://localhost/api/calendar/generate", {
        method: "POST",
        body: JSON.stringify({ month: "2026-04" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("existing");
    expect(json.plan.month).toBe("2026-04");
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("generates and stores a new plan when forced", async () => {
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    const existing = {
      id: "plan-1",
      data: { month: "2026-04", timezone: "UTC", items: [] },
    };
    const latestStrategy = {
      id: "strategy-1",
      version: 2,
      data: strategy,
      createdAt: new Date(),
    };
    const latestManifesto = {
      id: "manifesto-1",
      data: manifesto,
      createdAt: new Date(),
    };
    const generated = {
      month: "2026-04",
      timezone: "UTC",
      items: [
        {
          id: "linkedin-2026-04-01-1",
          date: "2026-04-01",
          platform: "linkedin",
          pillar: strategy.pillars[0]!.name,
          idea: "Share a practical insight anchored to the pillar.",
          contentType: "text-only",
        },
      ],
    };

    selectQueue.push([existing], [latestStrategy], [latestManifesto], [{ data: generated }]);
    const { runCalendarAgent } = await import("@/lib/agents/calendar");
    vi.mocked(runCalendarAgent).mockResolvedValueOnce(generated as never);

    const { POST } = await import("@/app/api/calendar/generate/route");
    const res = await POST(
      new Request("http://localhost/api/calendar/generate", {
        method: "POST",
        body: JSON.stringify({ month: "2026-04", force: true }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("generated");
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(json.plan.items).toHaveLength(1);
  });
});
