import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getRecentActivity } from "@/lib/audit-log";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/activity — recent activity feed */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`activity:${user.id}`);
    if (limited) return limited;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const items = await getRecentActivity(user.tenantId, { limit, offset });
    return NextResponse.json({ activity: items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
