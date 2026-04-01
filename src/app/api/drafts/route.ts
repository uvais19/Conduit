import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { groupVariants, listDrafts } from "@/lib/content/store";
import { platformType } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);

    const parsedPlatform = platformType.safeParse(searchParams.get("platform"));
    const platform = parsedPlatform.success ? parsedPlatform.data : undefined;
    const status = searchParams.get("status") ?? undefined;
    const pillar = searchParams.get("pillar") ?? undefined;
    const grouped = searchParams.get("grouped") === "true";

    const drafts = await listDrafts({
      tenantId,
      platform,
      status: status as never,
      pillar,
    });

    return NextResponse.json({
      drafts,
      grouped: grouped ? groupVariants(drafts) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Failed to fetch drafts:", error);
    return NextResponse.json({ error: "Unable to fetch drafts" }, { status: 500 });
  }
}
