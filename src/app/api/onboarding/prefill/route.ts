import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai/clients";
import type { ScraperResult } from "@/lib/agents/discovery/types";
import { runScraperAgent } from "@/lib/agents/discovery/scraper-agent";
import { requireAuth } from "@/lib/auth/permissions";

const prefillRequestSchema = z.object({
  websiteUrl: z.string().trim().min(1, "Enter your website URL"),
  businessName: z.string().trim().optional().default(""),
  industry: z.string().trim().optional().default(""),
});

function pickSuggestedBusinessName(
  scraper: ScraperResult,
  typedName: string
): string {
  const raw = scraper.title
    ?.trim()
    .replace(/^title\s*[:：]\s*/i, "")
    .trim();
  if (!raw) return "";
  const typed = typedName.trim();
  if (typed && raw.toLowerCase() === typed.toLowerCase()) return "";
  let t = raw.replace(/\s*[|\u2013\u2014]\s*.+$/, "").trim();
  t = t.replace(/\s+-\s+.+$/, "").trim();
  if (t.length < 2 || t.length > 100) return "";
  if (/^(home|welcome|official site)$/i.test(t)) return "";
  return t;
}

type PrefillSuggestions = {
  industry: string;
  targetAudience: string;
  goals: string;
  offerings: string;
  differentiators: string;
  brandTone: string;
  contentDos: string;
  contentDonts: string;
};

const emptyFallback: PrefillSuggestions = {
  industry: "",
  targetAudience: "",
  goals: "",
  offerings: "",
  differentiators: "",
  brandTone: "",
  contentDos: "",
  contentDonts: "",
};

export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const parsed = prefillRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { websiteUrl, businessName, industry } = parsed.data;

    const scraper = await runScraperAgent({
      websiteUrl,
      businessName,
      industry: industry || "Unknown",
      targetAudience: "",
      goals: "",
      offerings: "",
      differentiators: "",
      brandTone: "",
      contentDos: "",
      contentDonts: "",
      notes: "",
      documents: [],
    });

    const suggestions = await generateJson<PrefillSuggestions>({
      systemPrompt:
        "You are a brand strategist helping a business owner set up their social media strategy. Based on the website content provided, suggest practical, specific values for each field. Be concise and realistic — write as if filling in the form yourself. All values must be plain text with no markdown, no bullet symbols, and no dashes.",
      userPrompt: [
        `Business: ${businessName || "(name not provided — infer from the site)"}`,
        industry ? `Industry hint: ${industry}` : "",
        "",
        "Website content:",
        scraper.summary,
        "",
        "Return a JSON object with exactly these keys. All values are strings.",
        "- industry: The specific sector, e.g. 'B2B SaaS' or 'Independent Coffee Shop'",
        "- targetAudience: 2-3 sentences describing the ideal customer — who they are, their role, and main pain points",
        "- goals: 3-4 social media goals, one per line, e.g. 'Build brand awareness'",
        "- offerings: Main products or services, one per line",
        "- differentiators: 2-3 things that make this business stand out, one per line",
        "- brandTone: 4-6 adjectives for the brand voice, comma-separated, e.g. 'friendly, professional, clear'",
        "- contentDos: 3-4 content approaches to encourage, one per line",
        "- contentDonts: 3-4 content approaches to avoid, one per line",
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.4,
      fallback: emptyFallback,
    });

    const suggestedBusinessName = pickSuggestedBusinessName(
      scraper,
      businessName
    );

    return NextResponse.json({ suggestions, suggestedBusinessName });
  } catch (error) {
    console.error("Prefill failed:", error);
    return NextResponse.json(
      { error: "Unable to generate suggestions" },
      { status: 500 }
    );
  }
}
