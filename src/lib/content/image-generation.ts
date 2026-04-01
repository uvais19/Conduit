import { randomUUID } from "crypto";
import { generateText } from "@/lib/ai/clients";
import { uploadFile } from "@/lib/storage/r2";

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

  const svg = svgPlaceholder({
    headline: "Conduit AI Visual",
    body: refinedPrompt.slice(0, 90),
  });

  const key = `${tenantId}/generated/${randomUUID()}.svg`;
  if (canUseR2()) {
    const imageUrl = await uploadFile(key, Buffer.from(svg), "image/svg+xml");
    return { imageUrl, provider: "gemini-prompt+svg", prompt: refinedPrompt };
  }

  return {
    imageUrl: `local-preview://${key}`,
    provider: "local-fallback",
    prompt: refinedPrompt,
  };
}
