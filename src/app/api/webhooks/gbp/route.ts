import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { classifyWebhookEventType, ingestWebhookEvent } from "@/lib/platforms/webhook-events";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const message = parsed?.message ?? parsed;
    const eventId =
      typeof message?.eventId === "string"
        ? message.eventId
        : typeof message?.name === "string"
          ? message.name
          : randomUUID();
    ingestWebhookEvent(String(message?.locationName ?? "global"), {
      id: eventId,
      platform: "gbp",
      eventType: classifyWebhookEventType(message),
      occurredAt: new Date().toISOString(),
      postId: typeof message?.localPostName === "string" ? message.localPostName : undefined,
      dedupeKey: `${message?.locationName ?? "global"}:${eventId}`,
      payload: parsed,
    });
  } catch {
    // acknowledge to avoid retries for malformed payloads
  }
  return NextResponse.json({ received: true });
}
