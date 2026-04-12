import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications";
import { rateLimitResponse } from "@/lib/rate-limit";

/** GET /api/notifications — list notifications + unread count */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const limited = rateLimitResponse(`notifications:${user.id}`);
    if (limited) return limited;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const [items, unread] = await Promise.all([
      getUserNotifications(user.id, { limit, offset }),
      getUnreadCount(user.id),
    ]);

    return NextResponse.json({ notifications: items, unread });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/notifications — mark read (single or all) */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = (await req.json()) as { id?: string; markAllRead?: boolean };

    if (body.markAllRead) {
      await markAllAsRead(user.id);
    } else if (body.id) {
      await markAsRead(body.id);
    }

    const unread = await getUnreadCount(user.id);
    return NextResponse.json({ ok: true, unread });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
