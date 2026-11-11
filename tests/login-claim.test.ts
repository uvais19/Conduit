import { describe, expect, it } from "vitest";
import { decideLoginClaim, normalizeEmail } from "@/lib/auth/login-claim";

describe("login claim", () => {
  it("claims a placeholder with no clerk id", () => {
    expect(decideLoginClaim(null, { clerkId: null })).toBe("claim_placeholder");
  });

  it("keeps an existing clerk user", () => {
    expect(decideLoginClaim({ clerkId: "clerk_1" }, { clerkId: "clerk_1" })).toBe("use_existing");
  });

  it("does not replace a different clerk user", () => {
    expect(decideLoginClaim(null, { clerkId: "clerk_other" })).toBe("email_taken");
  });

  it("creates a workspace when the email is unknown", () => {
    expect(decideLoginClaim(null, null)).toBe("create_workspace");
  });

  it("normalizes invite emails", () => {
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
  });
});
