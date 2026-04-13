import { createHmac, timingSafeEqual } from "crypto";
import type { Platform } from "@/lib/types";

type OAuthStatePayload = {
  tenantId: string;
  userId: string;
  platform: Platform;
  provider: "meta" | "linkedin" | "x" | "gbp";
};

function secret(): string {
  const value = process.env.OAUTH_STATE_SECRET ?? process.env.META_APP_SECRET;
  if (!value) throw new Error("OAUTH_STATE_SECRET (or META_APP_SECRET) must be configured");
  return value;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  try {
    const separator = state.indexOf(".");
    if (separator < 1) return null;
    const encoded = state.slice(0, separator);
    const signature = state.slice(separator + 1);
    const expected = createHmac("sha256", secret()).update(encoded).digest("base64url");
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!parsed.tenantId || !parsed.userId || !parsed.platform || !parsed.provider) return null;
    return parsed;
  } catch {
    return null;
  }
}
