import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftById } from "@/lib/content/store";
import { runRevisionAgent } from "@/lib/agents/content/revision-agent";
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
    const revisionNotes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!revisionNotes) {
      return NextResponse.json(
        { error: "Revision notes are required" },
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

    const revision = await runRevisionAgent({
      draft,
      revisionNotes,
      manifesto: manifestoRow.data as BrandManifesto,
    });

    return NextResponse.json({ revision });
  } catch (error) {
    console.error("AI revision failed:", error);
    return NextResponse.json(
      { error: "Unable to generate AI revision" },
      { status: 500 }
    );
  }
}
