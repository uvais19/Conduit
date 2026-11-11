import { afterEach, describe, expect, it } from "vitest";
import { authorizeCron } from "@/lib/jobs/cron-auth";

const originalJobSecret = process.env.CRON_JOB_SECRET;
const originalCronSecret = process.env.CRON_SECRET;

function requestWith(secret?: string): Request {
  const headers = new Headers();
  if (secret !== undefined) headers.set("x-cron-secret", secret);
  return new Request("http://localhost/api/jobs", { headers });
}

function requestWithBearer(token: string): Request {
  return new Request("http://localhost/api/cron", {
    headers: { authorization: `Bearer ${token}` },
  });
}

afterEach(() => {
  if (originalJobSecret === undefined) delete process.env.CRON_JOB_SECRET;
  else process.env.CRON_JOB_SECRET = originalJobSecret;
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("authorizeCron", () => {
  it("rejects when no cron secret is configured", () => {
    delete process.env.CRON_JOB_SECRET;
    delete process.env.CRON_SECRET;
    expect(authorizeCron(requestWith("anything"))).toBe("missing_secret");
    expect(authorizeCron(requestWithBearer("anything"))).toBe("missing_secret");
  });

  it("rejects a missing or wrong header", () => {
    process.env.CRON_JOB_SECRET = "cron-secret";
    delete process.env.CRON_SECRET;
    expect(authorizeCron(requestWith())).toBe("unauthorized");
    expect(authorizeCron(requestWith("wrong"))).toBe("unauthorized");
    expect(authorizeCron(requestWith("cron-secre"))).toBe("unauthorized");
  });

  it("accepts a matching header", () => {
    process.env.CRON_JOB_SECRET = "cron-secret";
    delete process.env.CRON_SECRET;
    expect(authorizeCron(requestWith("cron-secret"))).toBe("ok");
  });

  it("accepts a Vercel bearer token", () => {
    delete process.env.CRON_JOB_SECRET;
    process.env.CRON_SECRET = "vercel-cron-secret";
    expect(authorizeCron(requestWithBearer("vercel-cron-secret"))).toBe("ok");
    expect(authorizeCron(requestWithBearer("wrong"))).toBe("unauthorized");
  });
});
