import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listNotifications,
  markAllRead,
} from "@/lib/notifications/store";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = listNotifications(session.user.tenantId);
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to fetch notifications" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    markAllRead(session.user.tenantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to mark notifications read" }, { status: 500 });
  }
}
