import { randomUUID } from "crypto";
import { generateText } from "@/lib/ai/clients";
import { writeLocalMediaFile } from "@/lib/storage/local-media";
import { uploadFile } from "@/lib/storage/r2";

type DalleSize = "1024x1024" | "1024x1792" | "1792x1024";

function openAiImageSize(aspectRatio: "1:1" | "4:5" | "9:16" | "16:9"): DalleSize {
  if (aspectRatio === "9:16" || aspectRatio === "4:5") return "1024x1792";
  if (aspectRatio === "16:9") return "1792x1024";
  return "1024x1024";
}

async function tryOpenAiRasterImage({
  refinedPrompt,
  aspectRatio,
  tenantId,
}: {
  refinedPrompt: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  tenantId: string;
}): Promise<{ imageUrl: string; provider: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";
  const size = openAiImageSize(aspectRatio);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: refinedPrompt.slice(0, 3900),
      n: 1,
      size,
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.warn("OpenAI image generation failed:", response.status, errText);
    return null;
  }

  const data = (await response.json()) as {
    data?: Array<{ url?: string }>;
  };
  const url = data.data?.[0]?.url;
  if (!url) return null;

  const imgRes = await fetch(url);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") || "image/png";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "png";
  const key = `${tenantId}/generated/${randomUUID()}.${ext}`;

  if (canUseR2()) {
    const imageUrl = await uploadFile(key, buf, contentType);
    return { imageUrl, provider: `${model}-raster` };
  }

  await writeLocalMediaFile(key, buf);
  return {
    imageUrl: `local-preview://${key}`,
    provider: `${model}-raster-local`,
  };
}

function canUseR2(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

function svgPlaceholder({
  headline,
  body,
}: {
  headline: string;
  body: string;
}): string {
  const escapedHeadline = headline
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)" />
  <rect x="72" y="72" width="936" height="936" rx="24" fill="rgba(255,255,255,0.08)" />
  <text x="120" y="220" fill="#ffffff" font-size="58" font-family="ui-sans-serif, system-ui" font-weight="700">${escapedHeadline}</text>
  <text x="120" y="320" fill="#dbeafe" font-size="32" font-family="ui-sans-serif, system-ui">${escapedBody}</text>
</svg>`;
}

export async function generateImageAsset({
  tenantId,
  prompt,
  aspectRatio,
}: {
  tenantId: string;
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
}): Promise<{ imageUrl: string; provider: string; prompt: string }> {
  const refinedPrompt =
    (await generateText({
      systemPrompt:
        "You refine social media image prompts. Keep them concise, visual, and production ready.",
      userPrompt: `Refine this prompt for aspect ratio ${aspectRatio}: ${prompt}`,
      temperature: 0.2,
    })) ?? prompt;

  try {
    const raster = await tryOpenAiRasterImage({
      refinedPrompt,
      aspectRatio,
      tenantId,
    });
    if (raster) {
      return { imageUrl: raster.imageUrl, provider: raster.provider, prompt: refinedPrompt };
    }
  } catch (e) {
    console.warn("Raster image generation error, falling back to SVG:", e);
  }

  const svg = svgPlaceholder({
    headline: "Conduit AI Visual",
    body: refinedPrompt.slice(0, 90),
  });

  const key = `${tenantId}/generated/${randomUUID()}.svg`;
  const body = Buffer.from(svg);
  if (canUseR2()) {
    const imageUrl = await uploadFile(key, body, "image/svg+xml");
    return { imageUrl, provider: "gemini-prompt+svg", prompt: refinedPrompt };
  }

  await writeLocalMediaFile(key, body);
  return {
    imageUrl: `local-preview://${key}`,
    provider: "local-fallback",
    prompt: refinedPrompt,
  };
}
