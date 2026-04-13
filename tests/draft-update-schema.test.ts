import { describe, it, expect } from "vitest";
import { draftUpdateSchema } from "@/lib/content/types";

describe("draftUpdateSchema", () => {
  it("accepts campaignId null and uuid", () => {
    expect(draftUpdateSchema.safeParse({ campaignId: null }).success).toBe(true);
    expect(
      draftUpdateSchema.safeParse({
        campaignId: "123e4567-e89b-12d3-a456-426614174000",
      }).success
    ).toBe(true);
  });

  it("rejects invalid campaign uuid", () => {
    expect(draftUpdateSchema.safeParse({ campaignId: "not-a-uuid" }).success).toBe(false);
  });
});
