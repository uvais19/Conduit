import type { DiscoveryInput, ScraperResult } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, name: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  return html.match(pattern)?.[1]?.trim();
}

async function tryJinaReader(url: string): Promise<string | null> {
  const apiKey = process.env.JINA_API_KEY;
  const response = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "text/plain",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.text()).trim() || null;
}

export async function runScraperAgent(
  input: DiscoveryInput
): Promise<ScraperResult> {
  const websiteUrl = input.websiteUrl?.trim();

  if (!websiteUrl) {
    return {
      summary: "No website was provided, so discovery will rely on manual business input.",
      keyPoints: [
        input.businessName,
        input.industry,
        input.offerings,
      ].filter(Boolean),
      source: "manual",
    };
  }

  try {
    const jinaText = await tryJinaReader(websiteUrl).catch(() => null);
    if (jinaText) {
      const summary = jinaText.slice(0, 4000);
      return {
        websiteUrl,
        title: input.businessName,
        description: `Website content discovered for ${input.businessName}.`,
        summary,
        keyPoints: summary
          .split(/\.|\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 6),
        source: "website",
      };
    }

    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "ConduitBot/1.0 (+https://conduit.local)",
      },
    });

    if (!response.ok) {
      throw new Error(`Website returned ${response.status}`);
    }

    const html = await response.text();
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
    const description =
      extractMeta(html, "description") || extractMeta(html, "og:description");
    const text = stripHtml(html).slice(0, 4000);

    return {
      websiteUrl,
      title,
      description,
      summary: text || `Website fetched successfully for ${input.businessName}.`,
      keyPoints: [title, description, ...text.split(/\./).slice(0, 4)]
        .map((item) => item?.trim())
        .filter(Boolean) as string[],
      source: "website",
    };
  } catch (error) {
    console.error("Scraper agent failed:", error);
    return {
      websiteUrl,
      title: input.businessName,
      description: `Unable to scrape ${websiteUrl}; falling back to manual business details.`,
      summary: [
        `Business: ${input.businessName}`,
        `Industry: ${input.industry}`,
        `Offerings: ${input.offerings}`,
        `Audience: ${input.targetAudience}`,
      ].join("\n"),
      keyPoints: [input.industry, input.offerings, input.targetAudience].filter(Boolean),
      source: "unavailable",
    };
  }
}
