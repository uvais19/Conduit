import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  classifyWebhookEventType,
  ingestWebhookEvent,
  processWebhookJobs,
} from "@/lib/platforms/webhook-events";

function verifyXSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const secret = process.env.X_WEBHOOK_SECRET;
  const raw = await request.text();
  const signature = request.headers.get("x-twitter-webhooks-signature");
  if (secret && !verifyXSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const events = Array.isArray(parsed?.events) ? parsed.events : [parsed];
    for (const event of events) {
      const eventId =
        typeof event?.id_str === "string"
          ? event.id_str
          : typeof event?.tweet_create_events?.[0]?.id_str === "string"
            ? event.tweet_create_events[0].id_str
            : randomUUID();
      const postId =
        typeof event?.tweet_create_events?.[0]?.id_str === "string"
          ? event.tweet_create_events[0].id_str
          : undefined;
      ingestWebhookEvent(String(event?.for_user_id ?? "global"), {
        id: eventId,
        platform: "x",
        eventType: classifyWebhookEventType(event),
        occurredAt: new Date().toISOString(),
        postId,
        dedupeKey: `${event?.for_user_id ?? "global"}:${eventId}`,
        payload: event,
      });
    }
  } catch {
    // swallow malformed payloads
  }
  const processed = processWebhookJobs(50);
  return NextResponse.json({ received: true, processed });
}
