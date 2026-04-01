import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos } from "@/lib/db/schema";
import { brandManifestoSchema } from "@/lib/types";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const [latestManifesto] = await db
      .select()
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    return NextResponse.json({
      manifesto: latestManifesto?.data ?? null,
      version: latestManifesto?.version ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch brand manifesto:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const parsed = brandManifestoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid manifesto payload" },
        { status: 400 }
      );
    }

    const [latestManifesto] = await db
      .select({ version: brandManifestos.version })
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    const [saved] = await db
      .insert(brandManifestos)
      .values({
        tenantId,
        data: parsed.data,
        version: (latestManifesto?.version ?? 0) + 1,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      manifesto: saved.data,
      version: saved.version,
    });
  } catch (error) {
    console.error("Failed to save brand manifesto:", error);
    return NextResponse.json(
      { error: "Unable to save brand manifesto" },
      { status: 500 }
    );
  }
}
