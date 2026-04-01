import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentStrategies } from "@/lib/db/schema";
import { contentStrategySchema } from "@/lib/types";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const [latestStrategy] = await db
      .select()
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt))
      .limit(1);

    return NextResponse.json({
      strategy: latestStrategy?.data ?? null,
      version: latestStrategy?.version ?? null,
      status: latestStrategy?.status ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch content strategy:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const parsed = contentStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid strategy payload" },
        { status: 400 }
      );
    }

    const [latestStrategy] = await db
      .select({ version: contentStrategies.version })
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt))
      .limit(1);

    const [saved] = await db
      .insert(contentStrategies)
      .values({
        tenantId,
        data: parsed.data,
        version: (latestStrategy?.version ?? 0) + 1,
        status: "active",
      })
      .returning();

    return NextResponse.json({
      strategy: saved.data,
      version: saved.version,
      status: saved.status,
    });
  } catch (error) {
    console.error("Failed to save content strategy:", error);
    return NextResponse.json(
      { error: "Unable to save content strategy" },
      { status: 500 }
    );
  }
}
