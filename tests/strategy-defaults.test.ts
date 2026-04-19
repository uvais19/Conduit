import { describe, expect, it } from "vitest";
import {
  buildCalendarPreview,
  createDefaultStrategy,
} from "@/lib/strategy/defaults";

describe("strategy defaults", () => {
  it("creates a valid baseline strategy", () => {
    const strategy = createDefaultStrategy({
      industry: "Coffee Shops",
      socialMediaGoals: ["Grow awareness"],
    });

    expect(strategy.pillars).toHaveLength(5);
    expect(strategy.pillars.reduce((sum, p) => sum + p.percentage, 0)).toBe(100);
    expect(strategy.schedule.length).toBeGreaterThan(0);
    expect(strategy.monthlyGoals.length).toBeGreaterThan(0);
  });

  it("builds sorted calendar preview items", () => {
    const strategy = createDefaultStrategy();
    const preview = buildCalendarPreview(strategy);

    expect(preview.length).toBeGreaterThan(0);
    const days = preview.map((item) => item.day);
    expect(days[0]).toBe("Monday");
  });
});
