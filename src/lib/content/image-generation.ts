import { randomUUID } from "crypto";
import { callGeminiGenerateContent, generateText } from "@/lib/ai/clients";
import { PLATFORM_KNOWLEDGE } from "@/lib/agents/platform-knowledge";
import type { ContentDraftRecord } from "@/lib/content/types";
import type { Platform } from "@/lib/types";
import { writeLocalMediaFile } from "@/lib/storage/local-media";
import { uploadFile } from "@/lib/storage/r2";

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const GEMINI_IMAGE_SIZES = new Set(["512", "1K", "2K", "4K"]);

type ConduitAspect = "1:1" | "4:5" | "9:16" | "16:9";

function canUseR2(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

function mapKnowledgeAspectToGemini(aspectRatio: string): string {
  if (aspectRatio === "1.91:1") return "16:9";
  return aspectRatio;
}

/** When the draft has no `recommendedAspectRatio`, match platform norms (see PLATFORM_KNOWLEDGE). */
function pickAspectFromKnowledge(
  platform: Platform,
  mediaType: ContentDraftRecord["mediaType"]
): string {
  const tall = mediaType === "video" || mediaType === "story";
  if (tall && (platform === "instagram" || platform === "facebook")) {
    return "9:16";
  }

  switch (platform) {
    case "instagram":
      return "4:5";
    case "linkedin":
    case "facebook":
      return mapKnowledgeAspectToGemini(
        PLATFORM_KNOWLEDGE[platform].mediaSpecs.dimensions[0]?.aspectRatio ?? "16:9"
      );
    default:
      return "1:1";
  }
}

function defaultImageSize(platform: Platform): "512" | "1K" | "2K" | "4K" {
  if (platform === "instagram") return "2K";
  return "1K";
}

function inferGeminiImageParams({
  platform,
  mediaType,
  resolvedAspect,
  aspectFromVisualPlan,
}: {
  platform: Platform;
  mediaType: ContentDraftRecord["mediaType"];
  resolvedAspect: ConduitAspect;
  aspectFromVisualPlan: boolean;
}): { aspectRatio: string; imageSize: string } {
  const envAspect = process.env.GEMINI_IMAGE_ASPECT_RATIO?.trim();
  const envSize = process.env.GEMINI_IMAGE_SIZE?.trim();

  const imageSize =
    envSize && GEMINI_IMAGE_SIZES.has(envSize)
      ? (envSize as "512" | "1K" | "2K" | "4K")
      : defaultImageSize(platform);

  const aspectRatio = envAspect?.length
    ? envAspect
    : aspectFromVisualPlan
      ? resolvedAspect
      : pickAspectFromKnowledge(platform, mediaType);

  return { aspectRatio, imageSize };
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; mime_type?: string; data?: string };
  inline_data?: { mimeType?: string; mime_type?: string; data?: string };
};

function firstInlineImageFromResponse(data: unknown): { buffer: Buffer; contentType: string } | null {
  const root = data as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const parts = root.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      try {
        const buffer = Buffer.from(inline.data, "base64");
        if (buffer.length > 0) {
          return { buffer, contentType: mime };
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function tryGemini31FlashImage({
  refinedPrompt,
  tenantId,
  platform,
  mediaType,
  resolvedAspect,
  aspectFromVisualPlan,
}: {
  refinedPrompt: string;
  tenantId: string;
  platform: Platform;
  mediaType: ContentDraftRecord["mediaType"];
  resolvedAspect: ConduitAspect;
  aspectFromVisualPlan: boolean;
}): Promise<{ imageUrl: string; provider: string } | null> {
  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_GEMINI_IMAGE_MODEL;
  const { aspectRatio, imageSize } = inferGeminiImageParams({
    platform,
    mediaType,
    resolvedAspect,
    aspectFromVisualPlan,
  });

  const data = await callGeminiGenerateContent(model, {
    contents: [
      {
        role: "user",
        parts: [{ text: refinedPrompt.slice(0, 8000) }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    },
  });

  if (!data) return null;

  const decoded = firstInlineImageFromResponse(data);
  if (!decoded) {
    console.warn("Gemini image response had no inline image part");
    return null;
  }

  const ext = decoded.contentType.includes("png")
    ? "png"
    : decoded.contentType.includes("webp")
      ? "webp"
      : decoded.contentType.includes("jpeg") || decoded.contentType.includes("jpg")
        ? "jpg"
        : "png";
  const key = `${tenantId}/generated/${randomUUID()}.${ext}`;

  if (canUseR2()) {
    const imageUrl = await uploadFile(key, decoded.buffer, decoded.contentType);
    return { imageUrl, provider: model };
  }

  await writeLocalMediaFile(key, decoded.buffer);
  return {
    imageUrl: `local-preview://${key}`,
    provider: `${model}-local`,
  };
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
  platform,
  mediaType,
  aspectFromVisualPlan,
}: {
  tenantId: string;
  prompt: string;
  aspectRatio: ConduitAspect;
  platform: Platform;
  mediaType: ContentDraftRecord["mediaType"];
  /** True when `aspectRatio` came from `draft.visualPlanData.recommendedAspectRatio`. */
  aspectFromVisualPlan: boolean;
}): Promise<{ imageUrl: string; provider: string; prompt: string }> {
  const refinedPrompt =
    (await generateText({
      systemPrompt:
        "You refine social media image prompts. Keep them concise, visual, and production ready.",
      userPrompt: `Refine this prompt for aspect ratio ${aspectRatio}: ${prompt}`,
      temperature: 0.2,
    })) ?? prompt;

  try {
    const raster = await tryGemini31FlashImage({
      refinedPrompt,
      tenantId,
      platform,
      mediaType,
      resolvedAspect: aspectRatio,
      aspectFromVisualPlan,
    });
    if (raster) {
      return { imageUrl: raster.imageUrl, provider: raster.provider, prompt: refinedPrompt };
    }
  } catch (e) {
    console.warn("Gemini image generation error, falling back to SVG:", e);
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
