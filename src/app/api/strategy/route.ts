import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentStrategies } from "@/lib/db/schema";
import { finalizeStrategyPillarNames } from "@/lib/strategy/strategy-generation-steps";
import { contentStrategySchema } from "@/lib/types";

const latestStrategyOrder = [desc(contentStrategies.createdAt), desc(contentStrategies.id)] as const;

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const [latestStrategy] = await db
      .select()
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(...latestStrategyOrder)
      .limit(1);

    const raw = latestStrategy?.data ?? null;
    const parsed = raw ? contentStrategySchema.safeParse(raw) : null;
    const strategy =
      parsed?.success === true ? finalizeStrategyPillarNames(parsed.data) : raw;

    return NextResponse.json(
      {
        strategy,
        version: latestStrategy?.version ?? null,
        status: latestStrategy?.status ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
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
      .orderBy(...latestStrategyOrder)
      .limit(1);

    const [inserted] = await db
      .insert(contentStrategies)
      .values({
        tenantId,
        data: parsed.data,
        version: (latestStrategy?.version ?? 0) + 1,
        status: "active",
      })
      .returning({ id: contentStrategies.id });

    if (!inserted) {
      return NextResponse.json({ error: "Unable to save content strategy" }, { status: 500 });
    }

    const [row] = await db
      .select({
        data: contentStrategies.data,
        version: contentStrategies.version,
        status: contentStrategies.status,
      })
      .from(contentStrategies)
      .where(
        and(eq(contentStrategies.id, inserted.id), eq(contentStrategies.tenantId, tenantId))
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Unable to load saved strategy" }, { status: 500 });
    }

    return NextResponse.json(
      {
        strategy: row.data,
        version: row.version,
        status: row.status,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to save content strategy:", error);
    return NextResponse.json(
      { error: "Unable to save content strategy" },
      { status: 500 }
    );
  }
}
