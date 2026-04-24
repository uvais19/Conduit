import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { rateLimitResponse } from "@/lib/rate-limit";
import { generateText, resolveGeminiModel, resolveGeminiThinking } from "@/lib/ai/clients";

const SUPPORTED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Arabic",
  "Hindi",
  "Russian",
  "Turkish",
  "Polish",
  "Swedish",
  "Indonesian",
  "Thai",
  "Vietnamese",
] as const;

export async function POST(request: NextRequest) {
  const draftModel = resolveGeminiModel("draft");
  const draftThinking = resolveGeminiThinking("draft", draftModel);
  const limited = rateLimitResponse("translate", { limit: 20, windowSeconds: 60 });
  if (limited) return limited;

  try {
    await requireAuth();
    const body = await request.json();
    const { content, targetLanguage, platform, preserveTone } = body as {
      content: string;
      targetLanguage: string;
      platform?: string;
      preserveTone?: boolean;
    };

    if (!content?.trim() || !targetLanguage?.trim()) {
      return NextResponse.json(
        { error: "Content and target language are required" },
        { status: 400 }
      );
    }

    if (
      !SUPPORTED_LANGUAGES.includes(
        targetLanguage as (typeof SUPPORTED_LANGUAGES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    const prompt = `Translate the following social media post to ${targetLanguage}.${
      platform ? ` This is for ${platform}.` : ""
    }${
      preserveTone !== false
        ? " Preserve the original tone, style, and intent. Adapt idioms and cultural references naturally rather than translating literally."
        : ""
    }

Keep hashtags relevant to the target audience (translate or localize them). Maintain any emojis. Keep the same structure (hook, body, CTA).

Original content:
${content}

Translated content:`;

    const translated = await generateText({
      userPrompt: prompt,
      geminiModel: draftModel,
      geminiThinking: draftThinking,
    });

    if (!translated) {
      return NextResponse.json({ error: "AI generation returned no result" }, { status: 502 });
    }

    return NextResponse.json({
      translated: translated.trim(),
      language: targetLanguage,
    });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
}
