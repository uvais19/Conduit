import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  classifyWebhookEventType,
  ingestWebhookEvent,
  processWebhookJobs,
} from "@/lib/platforms/webhook-events";

function verifyLinkedInSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET;
  const signature = request.headers.get("x-linkedin-signature");
  if (secret && !verifyLinkedInSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const events = Array.isArray(parsed?.elements) ? parsed.elements : [parsed];
    for (const event of events) {
      const eventId =
        typeof event?.activity === "string"
          ? event.activity
          : typeof event?.id === "string"
            ? event.id
            : randomUUID();
      ingestWebhookEvent(String(event?.organization ?? "global"), {
        id: eventId,
        platform: "linkedin",
        eventType: classifyWebhookEventType(event),
        occurredAt: new Date().toISOString(),
        postId: typeof event?.activity === "string" ? event.activity : undefined,
        dedupeKey: `${event?.organization ?? "global"}:${eventId}`,
        payload: event,
      });
    }
  } catch {
    // swallow malformed payloads to avoid provider retries storms
  }
  const processed = processWebhookJobs(50);
  return NextResponse.json({ received: true, processed });
}
