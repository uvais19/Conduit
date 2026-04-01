import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requirePermission } from "@/lib/auth/permissions";
import { resolveProposal, getProposalById } from "@/lib/optimization/store";

const resolveSchema = z.object({
  action: z.enum(["approved", "rejected"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("approve_strategy");
    const { id } = await params;
    const tenantId = session.user.tenantId;

    const existing = getProposalById(tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const resolved = resolveProposal(
      tenantId,
      id,
      parsed.data.action,
      session.user.id
    );

    if (!resolved) {
      return NextResponse.json(
        { error: "Proposal is not pending" },
        { status: 409 }
      );
    }

    return NextResponse.json({ proposal: resolved });
  } catch (error) {
    console.error("Failed to resolve proposal:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
