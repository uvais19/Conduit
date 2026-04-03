import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftById } from "@/lib/content/store";
import { runRefinementAgent } from "@/lib/agents/content/refinement-agent";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import type { BrandManifesto } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;

    const body = await request.json();
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    const draft = await getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const [manifestoRow] = await db
      .select({ data: brandManifestos.data })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    if (!manifestoRow?.data) {
      return NextResponse.json(
        { error: "Brand manifesto not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const refinement = await runRefinementAgent({
      draft,
      instruction,
      manifesto: manifestoRow.data as BrandManifesto,
    });

    return NextResponse.json({ refinement });
  } catch (error) {
    console.error("Content refinement failed:", error);
    return NextResponse.json(
      { error: "Unable to refine content" },
      { status: 500 }
    );
  }
}
