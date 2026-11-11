import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export type CronAuthResult = "ok" | "missing_secret" | "unauthorized";

function configuredSecrets(): string[] {
  return [process.env.CRON_JOB_SECRET, process.env.CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
}

function matchesSecret(token: string, secret: string): boolean {
  const tokenBytes = Buffer.from(token);
  const secretBytes = Buffer.from(secret);
  if (tokenBytes.length === 0 || tokenBytes.length !== secretBytes.length) return false;
  return timingSafeEqual(tokenBytes, secretBytes);
}

export function authorizeCron(request: Request): CronAuthResult {
  const secrets = configuredSecrets();
  if (secrets.length === 0) return "missing_secret";

  const header = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";

  if (header && process.env.CRON_JOB_SECRET && matchesSecret(header, process.env.CRON_JOB_SECRET)) {
    return "ok";
  }
  if (bearer && secrets.some((secret) => matchesSecret(bearer, secret))) {
    return "ok";
  }
  return "unauthorized";
}

export function cronUnauthorizedResponse(
  result: Exclude<CronAuthResult, "ok">
): NextResponse {
  if (result === "missing_secret") {
    return NextResponse.json(
      { error: "Cron secret is not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
}
