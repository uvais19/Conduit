import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listPlatformConnections } from "@/lib/platforms/store";

export async function GET() {
  try {
    const session = await requireAuth();
    const connections = listPlatformConnections(session.user.tenantId);
    return NextResponse.json({ connections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to list connections" }, { status: 500 });
  }
}
