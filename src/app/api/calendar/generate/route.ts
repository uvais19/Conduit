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

function currentWindowStart(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-${day}`;
}

type GeneratePayload = {
  month?: string;
  startDate?: string;
  timezone?: string;
  force?: boolean;
};

function isValidWindowStart(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= lastDayOfMonth;
}

function coerceWindowStart(raw?: string): string {
  if (!raw) return currentWindowStart();
  const value = raw.trim();
  if (isValidWindowStart(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    const normalized = `${value}-01`;
    if (isValidWindowStart(normalized)) return normalized;
  }
  return currentWindowStart();
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

function isDuplicateActivePlanError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    message?: string;
    code?: string;
    constraint?: string;
    cause?: {
      code?: string;
      constraint?: string;
      detail?: string;
      message?: string;
    };
  };
  const message = err.message ?? "";
  const code = err.code ?? err.cause?.code ?? "";
  const constraint = err.constraint ?? err.cause?.constraint ?? "";
  const detail = err.cause?.detail ?? "";
  return (
    code === "23505" ||
    constraint === "content_calendar_plans_tenant_month_status_unique" ||
    message.includes("content_calendar_plans_tenant_month_status_unique") ||
    detail.includes("content_calendar_plans_tenant_month_status_unique")
  );
}

function hasIdeaRichItems(plan: unknown): boolean {
  const parsed = calendarMonthPlanSchema.safeParse(plan);
  if (!parsed.success) return false;
  if (parsed.data.items.length === 0) return false;
  return parsed.data.items.every((item) => item.idea.trim().length >= 8);
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const month = coerceWindowStart(
      url.searchParams.get("startDate") ??
        url.searchParams.get("month") ??
        undefined
    );
    const plan = await findActivePlan(tenantId, month);
    if (!plan) {
      return NextResponse.json({ plan: null, month });
    }
    return NextResponse.json({
      plan: plan.data,
      month,
      source: hasIdeaRichItems(plan.data) ? "existing" : "stale",
    });
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
    const month = coerceWindowStart(body.startDate ?? body.month);
    const timezone = body.timezone?.trim() || "UTC";
    const force = Boolean(body.force);

    const existing = await findActivePlan(tenantId, month);
    if (existing && !force && hasIdeaRichItems(existing.data)) {
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

    let inserted: typeof contentCalendarPlans.$inferSelect | undefined;
    try {
      [inserted] = await db
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
    } catch (insertError) {
      // Another request may have inserted an active plan concurrently.
      if (!isDuplicateActivePlanError(insertError)) {
        throw insertError;
      }
      const concurrent = await findActivePlan(tenantId, month);
      if (concurrent) {
        return NextResponse.json({
          plan: concurrent.data,
          month,
          source: "existing",
        });
      }
      throw insertError;
    }

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
