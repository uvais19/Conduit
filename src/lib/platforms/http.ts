export class PlatformApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly platform: "linkedin" | "x" | "gbp",
    readonly body?: unknown
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

export async function platformRequest<T>(params: {
  platform: "linkedin" | "x" | "gbp";
  url: string;
  method?: "GET" | "POST";
  token: string;
  query?: Record<string, Primitive>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<T> {
  const { platform, url, token, method = "GET", query, body, headers } = params;
  const queryString = query ? toQuery(query) : "";
  const finalUrl = queryString ? `${url}?${queryString}` : url;

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
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error)
        : `Platform API request failed (${response.status})`;
    throw new PlatformApiError(message, response.status, platform, payload);
  }

  return payload as T;
}
