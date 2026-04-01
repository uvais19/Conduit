import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getDraftById } from "@/lib/content/store";
import { getMetricsForDraft } from "@/lib/analytics/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  try {
    const session = await requirePermission("view_analytics");
    const tenantId = session.user.tenantId;
    const { draftId } = await context.params;

    const draft = getDraftById(tenantId, draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const metrics = getMetricsForDraft(tenantId, draftId);
    return NextResponse.json({ draft, metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch draft analytics:", error);
    return NextResponse.json({ error: "Unable to fetch analytics" }, { status: 500 });
  }
}
