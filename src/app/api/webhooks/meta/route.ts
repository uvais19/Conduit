import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  classifyWebhookEventType,
  ingestWebhookEvent,
  processWebhookJobs,
} from "@/lib/platforms/webhook-events";

/**
 * Meta (Facebook / Instagram) Webhooks — verification + ingest endpoint.
 * Configure in Meta Developer → Webhooks with the same verify token and callback URL.
 */

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verify = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    token &&
    verify &&
    token === verify &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  const raw = await request.text();
  const sig = request.headers.get("x-hub-signature-256");

  if (!secret || !verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const entries = Array.isArray((parsed as { entry?: unknown } | null)?.entry)
    ? (parsed as { entry: unknown[] }).entry
    : [];
  for (const entry of entries) {
    const record = entry as {
      id?: unknown;
      time?: unknown;
      changes?: unknown;
    };
    const providerId = String(record?.id ?? "global");
    const changed = Array.isArray(record?.changes) ? record.changes : [];
    const firstChange = changed[0] as { value?: { post_id?: unknown }; field?: unknown } | undefined;
    const postId = firstChange?.value?.post_id;
    const dedupeKey = `${providerId}:${record?.time ?? "0"}:${firstChange?.field ?? "unknown"}`;
    await ingestWebhookEvent(providerId, {
      id: randomUUID(),
      platform: record?.id ? "facebook" : "instagram",
      eventType: classifyWebhookEventType(entry),
      occurredAt: new Date().toISOString(),
      postId: typeof postId === "string" ? postId : undefined,
      dedupeKey,
      payload: entry,
    });
  }

  const processed = await processWebhookJobs(50);
  return NextResponse.json({ received: true, processed });
}
