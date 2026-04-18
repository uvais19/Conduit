export class PlatformApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly platform: "linkedin",
    readonly body?: unknown,
    readonly code: "rate_limited" | "auth" | "forbidden" | "bad_request" | "upstream" = "upstream"
  ) {
    super(message);
    this.name = "PlatformApiError";
  }
}

type Primitive = string | number | boolean | undefined | null;

function toQuery(params: Record<string, Primitive>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function classifyStatus(status: number): PlatformApiError["code"] {
  if (status === 400) return "bad_request";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  return "upstream";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function platformRequest<T>(params: {
  platform: "linkedin";
  url: string;
  method?: "GET" | "POST";
  token: string;
  query?: Record<string, Primitive>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  maxAttempts?: number;
}): Promise<T> {
  const {
    platform,
    url,
    token,
    method = "GET",
    query,
    body,
    headers,
    maxAttempts = 3,
  } = params;
  const queryString = query ? toQuery(query) : "";
  const finalUrl = queryString ? `${url}?${queryString}` : url;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const startedAt = Date.now();
    const response = await fetch(finalUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const payload = await parseBody(response);
    const durationMs = Date.now() - startedAt;
    if (response.ok) {
      console.info("[platform.http] request_ok", {
        platform,
        method,
        finalUrl,
        attempt,
        durationMs,
      });
      return payload as T;
    }

    const code = classifyStatus(response.status);
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error)
        : `Platform API request failed (${response.status})`;
    const retriable = code === "rate_limited" || response.status >= 500;
    console.warn("[platform.http] request_failed", {
      platform,
      method,
      finalUrl,
      status: response.status,
      code,
      attempt,
      durationMs,
      retriable,
    });
    if (retriable && attempt < maxAttempts) {
      const backoffMs = Math.min(1500, 250 * 2 ** (attempt - 1));
      await delay(backoffMs);
      continue;
    }
    throw new PlatformApiError(message, response.status, platform, payload, code);
  }
  throw new PlatformApiError("Platform request exhausted retries", 500, platform);
}
