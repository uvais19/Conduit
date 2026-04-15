import { NextResponse } from "next/server";
import { collectAllMetrics } from "@/lib/agents/analytics/collector";
import { getPlatformConnection } from "@/lib/platforms/store";

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized cron request" },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const secret = process.env.CRON_JOB_SECRET;
  if (secret) {
    const token = request.headers.get("x-cron-secret");
    if (!token || token !== secret) return unauthorized();
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      tenantId?: unknown;
    };
    if (typeof body.tenantId !== "string" || !body.tenantId.trim()) {
      return NextResponse.json(
        { error: "tenantId is required for scheduled analytics collection." },
        { status: 400 },
      );
    }

    const collected = await collectAllMetrics(body.tenantId, (platform) =>
      getPlatformConnection(body.tenantId as string, platform),
    );

    return NextResponse.json({
      ok: true,
      tenantId: body.tenantId,
      collected,
      message: `Scheduled analytics collection completed for ${collected} post(s).`,
    });
  } catch (error) {
    console.error("Scheduled analytics collection failed:", error);
    return NextResponse.json(
      { error: "Unable to run scheduled analytics collection" },
      { status: 500 },
    );
  }
}
