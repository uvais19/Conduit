import { createHmac, timingSafeEqual } from "crypto";

export type MetaOAuthPlatform = "instagram" | "facebook";

export type MetaOAuthStatePayload = {
  tenantId: string;
  userId: string;
  platform: MetaOAuthPlatform;
};

function secret(): string {
  const s = process.env.META_APP_SECRET;
  if (!s) throw new Error("META_APP_SECRET is not configured");
  return s;
}

export function signMetaOAuthState(payload: MetaOAuthStatePayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyMetaOAuthState(state: string): MetaOAuthStatePayload | null {
  try {
    const dot = state.indexOf(".");
    if (dot <= 0) return null;
    const data = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(data).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as MetaOAuthStatePayload;
    if (!parsed.tenantId || !parsed.userId || !parsed.platform) return null;
    if (parsed.platform !== "instagram" && parsed.platform !== "facebook")
      return null;
    return parsed;
  } catch {
    return null;
  }
}
