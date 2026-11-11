import { describe, expect, it } from "vitest";
import {
  decideWebhookDelivery,
  matchConnectionTenant,
  shouldNotifyWebhook,
} from "@/lib/platforms/webhook-events";

const connections = [
  {
    tenantId: "tenant-1",
    platformPageId: "page-1",
    platformUserId: "ig-1",
  },
];

describe("webhook delivery", () => {
  it("ignores a repeated dedupe key", () => {
    const decision = decideWebhookDelivery(true, "tenant-1");
    expect(decision).toBe("duplicate");
    expect(shouldNotifyWebhook(decision)).toBe(false);
  });

  it("does not notify when the provider id does not match a connection", () => {
    expect(matchConnectionTenant("unknown-page", connections)).toBeNull();
    expect(matchConnectionTenant("global", connections)).toBeNull();
    const decision = decideWebhookDelivery(false, null);
    expect(decision).toBe("skipped");
    expect(shouldNotifyWebhook(decision)).toBe(false);
  });

  it("notifies when a provider id matches a connection", () => {
    expect(matchConnectionTenant("page-1", connections)).toBe("tenant-1");
    expect(matchConnectionTenant("ig-1", connections)).toBe("tenant-1");
    const decision = decideWebhookDelivery(false, "tenant-1");
    expect(decision).toBe("pending");
    expect(shouldNotifyWebhook(decision)).toBe(true);
  });
});
