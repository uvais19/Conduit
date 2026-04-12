import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
} from "@/lib/content/templates";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/content/templates — list all templates */
export async function GET() {
  try {
    const { user } = await requireAuth();
    const templates = await listTemplates(user.tenantId);
    return NextResponse.json({ templates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/content/templates — create a template */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`templates:${user.id}`, { limit: 20, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const template = await createTemplate(user.tenantId, {
      ...body,
      createdBy: user.id,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/content/templates — delete a template */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteTemplate(user.tenantId, body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
