import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getRecycleCandidates } from "@/lib/content/recycling";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function GET() {
  const limited = rateLimitResponse("recycle", { limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const { user } = await requireAuth();
    const candidates = await getRecycleCandidates(user.tenantId);
    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json(
      { error: "Failed to load recycle candidates" },
      { status: 500 }
    );
  }
}
