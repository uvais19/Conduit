import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getCompetitorInsightsForStrategy } from "@/lib/agents/competitors/competitor-agent";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const insights = await getCompetitorInsightsForStrategy(tenantId);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Failed to fetch competitor insights:", error);
    return NextResponse.json(
      { error: "Unable to fetch competitor insights" },
      { status: 500 }
    );
  }
}
