import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { runCalendarAgent } from "@/lib/agents/calendar";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  brandManifestos,
  contentCalendarPlans,
  contentStrategies,
} from "@/lib/db/schema";
import {
  calendarMonthPlanSchema,
  contentStrategySchema,
  type BrandManifesto,
} from "@/lib/types";

function currentMonth(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

type GeneratePayload = {
  month?: string;
  timezone?: string;
  force?: boolean;
};

function coerceMonth(raw?: string): string {
  if (!raw) return currentMonth();
  const value = raw.trim();
  return /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

async function findActivePlan(tenantId: string, month: string) {
  const [row] = await db
    .select()
    .from(contentCalendarPlans)
    .where(
      and(
        eq(contentCalendarPlans.tenantId, tenantId),
        eq(contentCalendarPlans.month, month),
        eq(contentCalendarPlans.status, "active")
      )
    )
    .orderBy(desc(contentCalendarPlans.createdAt), desc(contentCalendarPlans.id))
    .limit(1);
  return row ?? null;
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const month = coerceMonth(url.searchParams.get("month") ?? undefined);
    const plan = await findActivePlan(tenantId, month);
    if (!plan) {
      return NextResponse.json({ plan: null, month });
    }
    return NextResponse.json({ plan: plan.data, month, source: "existing" });
  } catch (error) {
    console.error("Failed to fetch calendar plan:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const body = (await request.json().catch(() => ({}))) as GeneratePayload;
    const month = coerceMonth(body.month);
    const timezone = body.timezone?.trim() || "UTC";
    const force = Boolean(body.force);

    const existing = await findActivePlan(tenantId, month);
    if (existing && !force) {
      return NextResponse.json({ plan: existing.data, month, source: "existing" });
    }

    const [latestStrategy] = await db
      .select()
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt), desc(contentStrategies.id))
      .limit(1);

    if (!latestStrategy?.data) {
      return NextResponse.json(
        { error: "Generate and save a strategy before creating a calendar plan." },
        { status: 400 }
      );
    }

    const parsedStrategy = contentStrategySchema.safeParse(latestStrategy.data);
    if (!parsedStrategy.success) {
      return NextResponse.json(
        { error: "Stored strategy is invalid. Save strategy again and retry." },
        { status: 400 }
      );
    }

    const [latestManifesto] = await db
      .select()
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt), desc(brandManifestos.id))
      .limit(1);

    if (!latestManifesto?.data) {
      return NextResponse.json(
        { error: "Complete onboarding first so a Brand Manifesto exists." },
        { status: 400 }
      );
    }

    const generated = await runCalendarAgent({
      strategy: parsedStrategy.data,
      manifesto: latestManifesto.data as BrandManifesto,
      month,
      timezone,
    });

    const plan = calendarMonthPlanSchema.parse(generated);

    if (existing) {
      await db
        .update(contentCalendarPlans)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(contentCalendarPlans.id, existing.id));
    }

    const [inserted] = await db
      .insert(contentCalendarPlans)
      .values({
        tenantId,
        strategyId: latestStrategy.id,
        strategyVersion: latestStrategy.version,
        month,
        timezone: plan.timezone,
        data: plan,
        status: "active",
      })
      .returning();

    return NextResponse.json({
      plan: inserted?.data ?? plan,
      month,
      source: "generated",
    });
  } catch (error) {
    console.error("Failed to generate calendar plan:", error);
    return NextResponse.json(
      { error: "Unable to generate calendar plan" },
      { status: 500 }
    );
  }
}
