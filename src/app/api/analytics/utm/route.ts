import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { buildUtmLink } from "@/lib/analytics/store";

export async function POST(request: Request) {
  try {
    await requirePermission("view_analytics");
    const body = (await request.json()) as {
      destinationUrl?: unknown;
      source?: unknown;
      medium?: unknown;
      campaign?: unknown;
      term?: unknown;
      content?: unknown;
    };

    if (
      typeof body.destinationUrl !== "string" ||
      typeof body.source !== "string" ||
      typeof body.medium !== "string" ||
      typeof body.campaign !== "string"
    ) {
      return NextResponse.json(
        { error: "destinationUrl, source, medium, and campaign are required." },
        { status: 400 },
      );
    }

    const utmUrl = buildUtmLink({
      destinationUrl: body.destinationUrl,
      source: body.source,
      medium: body.medium,
      campaign: body.campaign,
      term: typeof body.term === "string" ? body.term : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
    });
    return NextResponse.json({ utmUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to build UTM URL" }, { status: 500 });
  }
}
