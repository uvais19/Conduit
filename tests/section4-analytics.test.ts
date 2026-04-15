import { describe, expect, it } from "vitest";
import { parseAnalyticsQueryFromUrl } from "@/lib/analytics/query";
import { buildUtmLink } from "@/lib/analytics/store";
import { buildCsv } from "@/lib/exports/reporting";

describe("Section 4 analytics utilities", () => {
  it("parses analytics query parameters from URL", () => {
    const url = new URL(
      "https://conduit.local/api/analytics?from=2026-01-01&to=2026-01-31&platforms=instagram,x,invalid"
    );
    const query = parseAnalyticsQueryFromUrl(url);
    expect(query.from).toBe("2026-01-01");
    expect(query.to).toBe("2026-01-31");
    expect(query.platforms).toEqual(["instagram", "x"]);
  });

  it("builds UTM links with required parameters", () => {
    const link = buildUtmLink({
      destinationUrl: "https://example.com/pricing",
      source: "newsletter",
      medium: "social",
      campaign: "spring-launch",
      content: "hero-cta",
    });
    expect(link).toContain("utm_source=newsletter");
    expect(link).toContain("utm_medium=social");
    expect(link).toContain("utm_campaign=spring-launch");
    expect(link).toContain("utm_content=hero-cta");
  });

  it("builds CSV output with escaped values", () => {
    const csv = buildCsv(["caption", "impressions"], [
      { caption: 'Hello, "Conduit"', impressions: 42 },
    ]);
    expect(csv).toContain('"Hello, ""Conduit"""');
    expect(csv).toContain("42");
  });
});
