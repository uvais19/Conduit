import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { rateLimitResponse } from "@/lib/rate-limit";
import { generateText } from "@/lib/ai/clients";
import { PLATFORM_LABELS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse("adapt", { limit: 20, windowSeconds: 60 });
  if (limited) return limited;

  try {
    await requireAuth();
    const body = await request.json();
    const { content, sourcePlatform, targetPlatform, hashtags, cta } = body as {
      content: string;
      sourcePlatform: string;
      targetPlatform: string;
      hashtags?: string[];
      cta?: string;
    };

    if (!content?.trim() || !sourcePlatform || !targetPlatform) {
      return NextResponse.json(
        { error: "Content, source platform, and target platform are required" },
        { status: 400 }
      );
    }

    const sourceLabel =
      PLATFORM_LABELS[sourcePlatform as keyof typeof PLATFORM_LABELS] ??
      sourcePlatform;
    const targetLabel =
      PLATFORM_LABELS[targetPlatform as keyof typeof PLATFORM_LABELS] ??
      targetPlatform;

    const prompt = `Adapt the following ${sourceLabel} post for ${targetLabel}.

Adjust the format, tone, length, and conventions to match ${targetLabel}'s best practices:
- ${targetPlatform === "x" ? "Keep under 280 characters. Be concise and punchy." : ""}
- ${targetPlatform === "linkedin" ? "Professional tone. Can be longer (1300+ chars). Use line breaks for readability." : ""}
- ${targetPlatform === "instagram" ? "Visual-first caption. Front-load the hook. Hashtags at the end (up to 30)." : ""}
- ${targetPlatform === "facebook" ? "Conversational tone. Questions drive engagement. Medium length." : ""}
- ${targetPlatform === "gbp" ? "Short, local-focused. Include a clear CTA. Under 1500 chars." : ""}

Keep the core message and intent. Adapt hashtags and CTA for the target platform.

Original ${sourceLabel} post:
${content}
${hashtags?.length ? `\nOriginal hashtags: ${hashtags.join(" ")}` : ""}
${cta ? `\nOriginal CTA: ${cta}` : ""}

Adapted ${targetLabel} post:`;

    const adapted = await generateText({ userPrompt: prompt });

    if (!adapted) {
      return NextResponse.json({ error: "AI generation returned no result" }, { status: 502 });
    }

    return NextResponse.json({
      adapted: adapted.trim(),
      sourcePlatform,
      targetPlatform,
    });
  } catch {
    return NextResponse.json(
      { error: "Adaptation failed" },
      { status: 500 }
    );
  }
}
