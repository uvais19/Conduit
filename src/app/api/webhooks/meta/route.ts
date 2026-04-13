import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

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

  if (secret && sig && !verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (process.env.NODE_ENV !== "production") {
      console.info("[webhooks/meta]", JSON.stringify(parsed)?.slice(0, 2000));
    }
  } catch {
    // ignore malformed body
  }

  // Future: route comments / mentions to notifications or inbox.
  return NextResponse.json({ received: true });
}
