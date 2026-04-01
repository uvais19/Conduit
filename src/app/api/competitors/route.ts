import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth/permissions";
import { listCompetitors, addCompetitor } from "@/lib/optimization/store";
import {
  discoverCompetitors,
  analyzeCompetitor,
} from "@/lib/agents/competitors/competitor-agent";
import type { Platform } from "@/lib/types";

const addCompetitorSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(["instagram", "facebook", "linkedin", "x", "gbp"]),
  profileUrl: z.string().url(),
});

const discoverSchema = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
});

const analyzeSchema = z.object({
  competitorId: z.string().uuid(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const competitors = await listCompetitors(tenantId);

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Failed to fetch competitors:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const body = await request.json();

    // Route based on action type
    if (body.action === "discover") {
      const parsed = discoverSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 }
        );
      }

      const discovered = await discoverCompetitors(
        tenantId,
        parsed.data.industry,
        parsed.data.location
      );

      return NextResponse.json({ discovered });
    }

    if (body.action === "analyze") {
      const parsed = analyzeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 }
        );
      }

      const analysis = await analyzeCompetitor(tenantId, parsed.data.competitorId);
      if (!analysis) {
        return NextResponse.json(
          { error: "Competitor not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ analysis });
    }

    // Default: manually add a competitor
    const parsed = addCompetitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const competitor = await addCompetitor({
      tenantId,
      name: parsed.data.name,
      platform: parsed.data.platform as Platform,
      profileUrl: parsed.data.profileUrl,
      discoveryMethod: "manual",
    });

    return NextResponse.json({ competitor });
  } catch (error) {
    console.error("Failed to process competitor request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
