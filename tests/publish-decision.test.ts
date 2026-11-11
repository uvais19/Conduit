import { describe, expect, it } from "vitest";
import { decidePublishBranch } from "@/lib/agents/publishing/publish-decision";
import type { PlatformConnection } from "@/lib/platforms/store";

describe("decidePublishBranch", () => {
  it("blocks publish when no platform connection exists", () => {
    expect(decidePublishBranch(null)).toEqual({
      kind: "blocked",
      reason: "not_connected",
    });
  });

  it("uses the live connection when one exists", () => {
    const connection = { id: "conn-1", platform: "linkedin" } as PlatformConnection;
    expect(decidePublishBranch(connection)).toEqual({
      kind: "live",
      connection,
    });
  });
});
