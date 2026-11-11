import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platforms/webhook-events", () => ({
  classifyWebhookEventType: () => "comment",
  ingestWebhookEvent: vi.fn(),
  processWebhookJobs: () => 0,
}));

import { POST as linkedInPost } from "@/app/api/webhooks/linkedin/route";
import { POST as metaPost } from "@/app/api/webhooks/meta/route";

const originalMeta = process.env.META_APP_SECRET;
const originalLinkedIn = process.env.LINKEDIN_WEBHOOK_SECRET;

function metaSignature(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function linkedInSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

afterEach(() => {
  if (originalMeta === undefined) delete process.env.META_APP_SECRET;
  else process.env.META_APP_SECRET = originalMeta;
  if (originalLinkedIn === undefined) delete process.env.LINKEDIN_WEBHOOK_SECRET;
  else process.env.LINKEDIN_WEBHOOK_SECRET = originalLinkedIn;
});

describe("webhook signatures", () => {
  it("rejects Meta requests when the secret or signature is missing or wrong", async () => {
    delete process.env.META_APP_SECRET;
    const unsigned = await metaPost(
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        body: "{}",
      })
    );
    expect(unsigned.status).toBe(401);

    process.env.META_APP_SECRET = "meta-secret";
    const bad = await metaPost(
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=deadbeef" },
        body: "{}",
      })
    );
    expect(bad.status).toBe(401);
  });

  it("accepts a valid Meta signature and rejects invalid JSON", async () => {
    const secret = "meta-secret";
    process.env.META_APP_SECRET = secret;
    const body = JSON.stringify({ entry: [] });
    const ok = await metaPost(
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": metaSignature(body, secret) },
        body,
      })
    );
    expect(ok.status).toBe(200);

    const invalid = "{";
    const rejected = await metaPost(
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": metaSignature(invalid, secret) },
        body: invalid,
      })
    );
    expect(rejected.status).toBe(400);
  });

  it("rejects LinkedIn requests without a valid signature", async () => {
    delete process.env.LINKEDIN_WEBHOOK_SECRET;
    const unsigned = await linkedInPost(
      new Request("http://localhost/api/webhooks/linkedin", {
        method: "POST",
        body: "{}",
      })
    );
    expect(unsigned.status).toBe(401);

    const secret = "linkedin-secret";
    process.env.LINKEDIN_WEBHOOK_SECRET = secret;
    const bad = await linkedInPost(
      new Request("http://localhost/api/webhooks/linkedin", {
        method: "POST",
        headers: { "x-linkedin-signature": "deadbeef" },
        body: "{}",
      })
    );
    expect(bad.status).toBe(401);

    const body = JSON.stringify({ elements: [] });
    const ok = await linkedInPost(
      new Request("http://localhost/api/webhooks/linkedin", {
        method: "POST",
        headers: { "x-linkedin-signature": linkedInSignature(body, secret) },
        body,
      })
    );
    expect(ok.status).toBe(200);
  });
});
