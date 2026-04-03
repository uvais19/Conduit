type GenerateTextOptions = {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  geminiModel?: string;
  groqModel?: string;
};

async function callGemini({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
}: GenerateTextOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = [systemPrompt, userPrompt].filter(Boolean).join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: "text/plain",
        },
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

async function callGroq({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  groqModel = "llama-3.3-70b-versatile",
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
  const geminiModel = options.geminiModel ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text;
}

export async function generateJson<T>(
  options: GenerateTextOptions & { fallback: T }
): Promise<T> {
  const text = await generateText(options);
  if (!text) {
    return options.fallback;
  }

  try {
    return JSON.parse(extractJsonBlock(text)) as T;
  } catch (error) {
    console.error("Failed to parse model JSON output:", error);
    return options.fallback;
  }
}
