import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listProposals } from "@/lib/optimization/store";
import { runOptimizerAgent } from "@/lib/agents/optimization/optimizer-agent";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const proposals = listProposals(tenantId);

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const newProposals = await runOptimizerAgent(tenantId);

    return NextResponse.json({ proposals: newProposals });
  } catch (error) {
    console.error("Failed to generate proposals:", error);
    return NextResponse.json(
      { error: "Failed to generate optimization proposals" },
      { status: 500 }
    );
  }
}
