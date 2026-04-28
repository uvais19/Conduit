import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyBrandManifesto } from "@/lib/brand/manifesto";
import { createDefaultStrategy } from "@/lib/strategy/defaults";

const selectQueue: unknown[][] = [];
let insertError: unknown;
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
      returning: async () => {
        if (insertError) throw insertError;
        return selectQueue.shift() ?? [];
      },
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

describe("/api/calendar/generate route", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertError = undefined;
    dbMock.select.mockClear();
    dbMock.update.mockClear();
    dbMock.insert.mockClear();
  });

  it("returns existing plan when present and not forced", async () => {
    const existing = {
      id: "plan-1",
      data: {
        month: "2026-04-01",
        timezone: "UTC",
        items: [
          {
            id: "linkedin-2026-04-01-1",
            date: "2026-04-01",
            platform: "linkedin",
            pillar: "Education",
            idea: "Share a concise educational idea for the target audience.",
            contentType: "text-only",
          },
        ],
      },
    };
    selectQueue.push([existing]);

    const { POST } = await import("@/app/api/calendar/generate/route");
    const res = await POST(
      new Request("http://localhost/api/calendar/generate", {
        method: "POST",
        body: JSON.stringify({ startDate: "2026-04-01" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("existing");
    expect(json.plan.month).toBe("2026-04-01");
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("generates and stores a new plan when forced", async () => {
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });

    const existing = {
      id: "plan-1",
      data: { month: "2026-04-01", timezone: "UTC", items: [] },
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
      month: "2026-04-01",
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
        body: JSON.stringify({ startDate: "2026-04-01", force: true }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("generated");
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(json.plan.items).toHaveLength(1);
  });

  it("coerces YYYY-MM input to first day for GET", async () => {
    selectQueue.push([]);
    const { GET } = await import("@/app/api/calendar/generate/route");
    const res = await GET(new Request("http://localhost/api/calendar/generate?month=2026-02"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.plan).toBeNull();
    expect(json.month).toBe("2026-02-01");
  });

  it("falls back to current UTC window for invalid startDate", async () => {
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    selectQueue.push([]);

    const { GET } = await import("@/app/api/calendar/generate/route");
    const res = await GET(
      new Request("http://localhost/api/calendar/generate?startDate=2026-13-99")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.month).toBe(expected);
  });

  it("marks existing plans with weak ideas as stale in GET", async () => {
    selectQueue.push([
      {
        id: "plan-stale",
        data: {
          month: "2026-04-01",
          timezone: "UTC",
          items: [
            {
              id: "linkedin-2026-04-01-1",
              date: "2026-04-01",
              platform: "linkedin",
              pillar: "Education",
              idea: "short",
              contentType: "text-only",
            },
          ],
        },
      },
    ]);

    const { GET } = await import("@/app/api/calendar/generate/route");
    const res = await GET(new Request("http://localhost/api/calendar/generate?month=2026-04-01"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("stale");
  });

  it("returns concurrent existing plan on duplicate active-plan insert conflict", async () => {
    const strategy = createDefaultStrategy();
    const manifesto = createEmptyBrandManifesto({ businessName: "Conduit Co" });
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
      month: "2026-04-01",
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

    const concurrent = {
      id: "plan-concurrent",
      data: generated,
    };

    selectQueue.push([], [latestStrategy], [latestManifesto], [concurrent]);
    insertError = {
      code: "23505",
      constraint: "content_calendar_plans_tenant_month_status_unique",
    };

    const { runCalendarAgent } = await import("@/lib/agents/calendar");
    vi.mocked(runCalendarAgent).mockResolvedValueOnce(generated as never);

    const { POST } = await import("@/app/api/calendar/generate/route");
    const res = await POST(
      new Request("http://localhost/api/calendar/generate", {
        method: "POST",
        body: JSON.stringify({ startDate: "2026-04-01", force: true }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("existing");
    expect(json.plan.month).toBe("2026-04-01");
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });
});
