import { beforeEach, describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import {
  classifyWebhookEventType,
  ingestWebhookEvent,
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
      platform: "x",
      provider: "x",
    });
    const tampered = `${state}tampered`;
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("classifies and ingests webhook events", () => {
    const eventType = classifyWebhookEventType({ type: "comment_created" });
    expect(eventType).toBe("comment");
    expect(() =>
      ingestWebhookEvent("tenant_1", {
        id: "evt_1",
        platform: "facebook",
        eventType,
        occurredAt: new Date().toISOString(),
        payload: { message: "test" },
      })
    ).not.toThrow();
  });
});
