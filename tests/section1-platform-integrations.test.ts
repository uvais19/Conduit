import { beforeEach, describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import {
  classifyWebhookEventType,
} from "@/lib/platforms/webhook-events";

describe("section1 platform integrations", () => {
  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = "test-secret";
  });

  it("signs and verifies provider oauth state", () => {
    const state = signOAuthState({
      tenantId: "tenant_1",
      userId: "user_1",
      platform: "linkedin",
      provider: "linkedin",
    });
    const verified = verifyOAuthState(state);
    expect(verified).toEqual({
      tenantId: "tenant_1",
      userId: "user_1",
      platform: "linkedin",
      provider: "linkedin",
    });
  });

  it("rejects tampered oauth state", () => {
    const state = signOAuthState({
      tenantId: "tenant_1",
      userId: "user_1",
      platform: "linkedin",
      provider: "linkedin",
    });
    const tampered = `${state}tampered`;
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("classifies webhook events", () => {
    expect(classifyWebhookEventType({ type: "comment_created" })).toBe("comment");
  });
});
