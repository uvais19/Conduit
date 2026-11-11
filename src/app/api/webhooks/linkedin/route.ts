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
  if (!secret || !verifyLinkedInSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = parsed as { elements?: unknown };
  const events = Array.isArray(record?.elements) ? record.elements : [parsed];
  for (const event of events) {
    const item = event as { activity?: unknown; id?: unknown; organization?: unknown };
    const eventId =
      typeof item?.activity === "string"
        ? item.activity
        : typeof item?.id === "string"
          ? item.id
          : randomUUID();
    await ingestWebhookEvent(String(item?.organization ?? "global"), {
      id: eventId,
      platform: "linkedin",
      eventType: classifyWebhookEventType(event),
      occurredAt: new Date().toISOString(),
      postId: typeof item?.activity === "string" ? item.activity : undefined,
      dedupeKey: `${item?.organization ?? "global"}:${eventId}`,
      payload: event,
    });
  }
  const processed = await processWebhookJobs(50);
  return NextResponse.json({ received: true, processed });
}
