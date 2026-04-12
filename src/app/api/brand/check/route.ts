import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkBrandConsistency } from "@/lib/agents/brand/consistency-checker";
import type { BrandManifesto } from "@/lib/types";
import { rateLimitResponse } from "@/lib/rate-limit";

/** POST /api/brand/check — check content against brand manifesto */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`brand-check:${user.id}`, { limit: 20, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { caption, hashtags, cta, platform } = body as {
      caption?: string;
      hashtags?: string[];
      cta?: string;
      platform?: string;
    };

    if (!caption || !platform) {
      return NextResponse.json(
        { error: "caption and platform are required" },
        { status: 400 },
      );
    }

    // Load latest manifesto
    const [row] = await db
      .select({ data: brandManifestos.data })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, user.tenantId))
      .orderBy(desc(brandManifestos.version))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "No brand manifesto found. Complete onboarding first." },
        { status: 404 },
      );
    }

    const result = await checkBrandConsistency({
      caption,
      hashtags: hashtags ?? [],
      cta: cta ?? null,
      platform,
      manifesto: row.data as BrandManifesto,
    });

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
