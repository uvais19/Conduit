import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/permissions";
import { getDraftById, updateDraft } from "@/lib/content/store";
import { draftUpdateSchema } from "@/lib/content/types";
import { validateDraftAgainstBrand } from "@/lib/brand/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await context.params;
    const draft = await getDraftById(tenantId, id);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Failed to fetch draft:", error);
    return NextResponse.json({ error: "Unable to fetch draft" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("edit_drafts");
    const tenantId = session.user.tenantId;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = draftUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update payload" },
        { status: 400 }
      );
    }

    const existing = await getDraftById(tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const shouldStrictValidate =
      parsed.data.status === "in-review" ||
      parsed.data.status === "approved" ||
      parsed.data.status === "scheduled" ||
      parsed.data.status === "published";
    if (shouldStrictValidate) {
      const candidate = {
        ...existing,
        ...parsed.data,
      };
      const validation = await validateDraftAgainstBrand({
        tenantId,
        draft: candidate,
        mode: "block",
      });
      if (!validation.compliance.canProceed) {
        return NextResponse.json(
          {
            error: "Draft failed brand compliance checks.",
            validation,
          },
          { status: 422 }
        );
      }
    }

    const updated = await updateDraft(tenantId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Failed to update draft:", error);
    return NextResponse.json({ error: "Unable to update draft" }, { status: 500 });
  }
}
