import { parseJsonFromModelResponse } from "@/lib/ai/parse-model-json";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type GeminiModelFeature =
  | "manifesto"
  | "strategy"
  | "draft"
  | "analysis"
  | "calendar";
export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export type GeminiThinkingConfig = {
  thinkingLevel?: GeminiThinkingLevel;
  thinkingBudget?: number;
};

const GEMINI_FEATURE_ENV_KEYS: Record<GeminiModelFeature, string> = {
  manifesto: "GEMINI_MANIFESTO_MODEL",
  strategy: "GEMINI_STRATEGY_MODEL",
  draft: "GEMINI_DRAFT_MODEL",
  analysis: "GEMINI_ANALYSIS_MODEL",
  calendar: "GEMINI_CALENDAR_MODEL",
};

const GEMINI_FEATURE_DEFAULTS: Record<GeminiModelFeature, string> = {
  manifesto: "gemini-3.0-flash-high",
  strategy: "gemini-3.0-flash-high",
  draft: "gemini-3.0-flash-low",
  analysis: "gemini-3.0-pro",
  calendar: "gemini-3.0-flash-high",
};

const GEMINI_FEATURE_THINKING_DEFAULTS: Record<GeminiModelFeature, GeminiThinkingLevel> = {
  manifesto: "high",
  strategy: "high",
  draft: "low",
  analysis: "high",
  calendar: "high",
};

/**
 * Resolution order:
 * 1) explicit override
 * 2) feature-specific env var
 * 3) global GEMINI_MODEL
 * 4) feature default model
 * 5) global hardcoded default
 */
export function resolveGeminiModel(
  feature: GeminiModelFeature,
  explicitModel?: string
): string {
  if (explicitModel?.trim()) return explicitModel.trim();

  const featureEnvKey = GEMINI_FEATURE_ENV_KEYS[feature];
  const featureEnvModel = process.env[featureEnvKey];
  if (featureEnvModel?.trim()) return featureEnvModel.trim();

  if (process.env.GEMINI_MODEL?.trim()) return process.env.GEMINI_MODEL.trim();

  return GEMINI_FEATURE_DEFAULTS[feature] ?? DEFAULT_GEMINI_MODEL;
}

function parseThinkingLevel(value?: string): GeminiThinkingLevel | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "minimal" ||
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high"
  ) {
    return normalized;
  }
  return undefined;
}

function parseThinkingBudget(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function defaultBudgetForLevel(level: GeminiThinkingLevel): number {
  if (level === "minimal") return 0;
  if (level === "low") return 1024;
  if (level === "medium") return 4096;
  return 12288;
}

/**
 * Resolve feature-specific thinking config for Gemini.
 * - Gemini 3 family: uses thinkingLevel
 * - Gemini 2.5 family: uses thinkingBudget (mapped from level when budget not explicitly set)
 */
export function resolveGeminiThinking(
  feature: GeminiModelFeature,
  model: string
): GeminiThinkingConfig {
  const upper = feature.toUpperCase();
  const levelFromEnv = parseThinkingLevel(process.env[`GEMINI_${upper}_THINKING_LEVEL`]);
  const budgetFromEnv = parseThinkingBudget(process.env[`GEMINI_${upper}_THINKING_BUDGET`]);
  const level = levelFromEnv ?? GEMINI_FEATURE_THINKING_DEFAULTS[feature];

  if (budgetFromEnv !== undefined) {
    return { thinkingBudget: budgetFromEnv };
  }

  if (model.startsWith("gemini-3")) {
    return { thinkingLevel: level };
  }

  if (model.startsWith("gemini-2.5")) {
    return { thinkingBudget: defaultBudgetForLevel(level) };
  }

  return {};
}

export type GenerateTextOptions = {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  geminiModel?: string;
  groqModel?: string;
  geminiThinking?: GeminiThinkingConfig;
  /**
   * Gemini structured output: JSON MIME type and optional responseSchema (JSON Schema object).
   * If the API rejects the schema, callers can retry without `responseSchema`.
   */
  geminiJson?: {
    responseSchema?: unknown;
  };
};

function stripGeminiUnsupportedSchemaKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripGeminiUnsupportedSchemaKeys);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "$schema" || k === "additionalProperties") continue;
      out[k] = stripGeminiUnsupportedSchemaKeys(v);
    }
    return out;
  }
  return value;
}

async function callGemini({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  geminiModel = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
  geminiThinking,
  geminiJson,
}: GenerateTextOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = [systemPrompt, userPrompt].filter(Boolean).join("\n\n");

  const generationConfig: Record<string, unknown> = {
    temperature,
    responseMimeType: geminiJson ? "application/json" : "text/plain",
  };
  if (geminiThinking?.thinkingLevel || geminiThinking?.thinkingBudget !== undefined) {
    generationConfig.thinkingConfig = {
      ...(geminiThinking.thinkingLevel
        ? { thinkingLevel: geminiThinking.thinkingLevel }
        : {}),
      ...(geminiThinking.thinkingBudget !== undefined
        ? { thinkingBudget: geminiThinking.thinkingBudget }
        : {}),
    };
  }
  if (geminiJson?.responseSchema !== undefined) {
    const rawSchema = geminiJson.responseSchema;
    const sanitizedSchema = stripGeminiUnsupportedSchemaKeys(rawSchema);
    generationConfig.responseSchema = sanitizedSchema;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );

  if (response.status === 429) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Gemini request failed: ${response.status} — ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() || null
  );
}

/**
 * Raw Gemini `generateContent` (any JSON body). Used for image models with custom `generationConfig`.
 * Returns null when the key is missing, on 429, or on non-OK HTTP (logs a warning).
 */
export async function callGeminiGenerateContent(
  model: string,
  body: Record<string, unknown>
): Promise<unknown | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (response.status === 429) {
    return null;
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.warn("Gemini generateContent failed:", response.status, errBody);
    return null;
  }

  return response.json();
}

async function callGroq({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  groqModel = process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
}: GenerateTextOptions): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: groqModel,
      temperature,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function generateText(options: GenerateTextOptions): Promise<string | null> {
  try {
    const geminiResult = await callGemini(options);
    if (geminiResult) {
      return geminiResult;
    }
  } catch (error) {
    console.error("Gemini provider failed, falling back:", error);
  }

  try {
    const groqResult = await callGroq(options);
    if (groqResult) {
      return groqResult;
    }
  } catch (error) {
    console.error("Groq provider failed:", error);
  }

  return null;
}

export async function generateTextStream(
  options: GenerateTextOptions
): Promise<ReadableStream<string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiModel = options.geminiModel ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

  if (apiKey) {
    const prompt = [options.systemPrompt, options.userPrompt].filter(Boolean).join("\n\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            responseMimeType: "text/plain",
            ...(options.geminiThinking?.thinkingLevel ||
            options.geminiThinking?.thinkingBudget !== undefined
              ? {
                  thinkingConfig: {
                    ...(options.geminiThinking.thinkingLevel
                      ? { thinkingLevel: options.geminiThinking.thinkingLevel }
                      : {}),
                    ...(options.geminiThinking.thinkingBudget !== undefined
                      ? { thinkingBudget: options.geminiThinking.thinkingBudget }
                      : {}),
                  },
                }
              : {}),
          },
        }),
      }
    );

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      return new ReadableStream<string>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE lines from Gemini streaming
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6)) as {
                  candidates?: Array<{
                    content?: { parts?: Array<{ text?: string }> };
                  }>;
                };
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(text);
              } catch {
                // Ignore malformed SSE chunks
              }
            }
          }
        },
      });
    }
  }

  // Fallback: wrap non-streaming result in a single-chunk stream
  const text = await generateText(options);
  return new ReadableStream<string>({
    start(controller) {
      if (text) controller.enqueue(text);
      controller.close();
    },
  });
}

export async function generateJson<T>(
  options: GenerateTextOptions & { fallback: T }
): Promise<T> {
  const text = await generateText(options);
  if (!text) {
    return options.fallback;
  }

  const parsed = parseJsonFromModelResponse<T>(text);
  if (parsed === null) {
    console.error("Failed to parse model JSON output");
    return options.fallback;
  }
  return parsed;
}

/**
 * Prefer Gemini `application/json` (+ optional `responseSchema`), retry JSON without schema on failure,
 * then fall back to plain `generateText` (Gemini text / Groq).
 */
export async function generateJsonStructured<T>(
  options: GenerateTextOptions & { fallback: T; responseSchema?: unknown }
): Promise<T> {
  const { fallback, responseSchema, ...textOpts } = options;

  const tryParse = (raw: string | null): T | null =>
    parseJsonFromModelResponse<T>(raw);

  let text: string | null = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      text = await callGemini({
        ...textOpts,
        geminiJson:
          responseSchema !== undefined ? { responseSchema } : {},
      });
    } catch (error) {
      console.warn("Gemini structured JSON call failed:", error);
      text = null;
    }

    if (!text && responseSchema !== undefined) {
      try {
        text = await callGemini({
          ...textOpts,
          geminiJson: {},
        });
      } catch (error) {
        console.warn("Gemini JSON (no schema) retry failed:", error);
        text = null;
      }
    }
  }

  if (!text) {
    const plain = await generateText(textOpts);
    const parsed = tryParse(plain);
    return parsed ?? fallback;
  }

  const parsed = tryParse(text);
  return parsed ?? fallback;
}
