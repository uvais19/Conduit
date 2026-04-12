import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentDrafts } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logActivity } from "@/lib/audit-log";
import { rateLimitResponse } from "@/lib/rate-limit";

/** POST /api/content/bulk — bulk operations on drafts */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`bulk:${user.id}`, { limit: 10, windowSeconds: 60 });
    if (limited) return limited;

    const body = await req.json();
    const { action, draftIds, scheduledAt } = body as {
      action?: string;
      draftIds?: string[];
      scheduledAt?: string;
    };

    if (!action || !draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json(
        { error: "action and draftIds[] are required" },
        { status: 400 },
      );
    }

    if (draftIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 drafts per bulk operation" },
        { status: 400 },
      );
    }

    let updated = 0;

    switch (action) {
      case "approve": {
        const result = await db
          .update(contentDrafts)
          .set({ status: "approved", approvedBy: user.id, updatedAt: new Date() })
          .where(
            and(
              eq(contentDrafts.tenantId, user.tenantId),
              eq(contentDrafts.status, "in-review"),
              inArray(contentDrafts.id, draftIds),
            ),
          );
        updated = result.rowCount ?? draftIds.length;
        break;
      }

      case "schedule": {
        if (!scheduledAt) {
          return NextResponse.json(
            { error: "scheduledAt is required for scheduling" },
            { status: 400 },
          );
        }
        const result = await db
          .update(contentDrafts)
          .set({
            status: "scheduled",
            scheduledAt: new Date(scheduledAt),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(contentDrafts.tenantId, user.tenantId),
              eq(contentDrafts.status, "approved"),
              inArray(contentDrafts.id, draftIds),
            ),
          );
        updated = result.rowCount ?? draftIds.length;
        break;
      }

      case "submit": {
        const result = await db
          .update(contentDrafts)
          .set({
            status: "in-review",
            reviewedBy: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(contentDrafts.tenantId, user.tenantId),
              eq(contentDrafts.status, "draft"),
              inArray(contentDrafts.id, draftIds),
            ),
          );
        updated = result.rowCount ?? draftIds.length;
        break;
      }

      case "delete": {
        const result = await db
          .delete(contentDrafts)
          .where(
            and(
              eq(contentDrafts.tenantId, user.tenantId),
              inArray(contentDrafts.id, draftIds),
            ),
          );
        updated = result.rowCount ?? draftIds.length;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    await logActivity({
      tenantId: user.tenantId,
      userId: user.id,
      action: action === "approve" ? "draft.approved" : action === "delete" ? "draft.deleted" : "draft.scheduled",
      resourceType: "draft",
      metadata: { action, draftCount: draftIds.length, updated },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
