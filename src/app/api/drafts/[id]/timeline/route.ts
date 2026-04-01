import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getDraftById } from "@/lib/content/store";
import { getAuditTrail } from "@/lib/content/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await context.params;

    const draft = getDraftById(tenantId, id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const events = getAuditTrail(tenantId, id);
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch timeline:", error);
    return NextResponse.json({ error: "Unable to fetch timeline" }, { status: 500 });
  }
}
