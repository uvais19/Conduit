import { headers } from "next/headers";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";

type ClerkUserEventData = {
  id: string;
  email_addresses: { email_address: string; id: string }[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: ClerkUserEventData;
};

function extractUserFields(data: ClerkUserEventData) {
  const email = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address ?? data.email_addresses[0]?.email_address;

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";

  return { email, name };
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(secret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created") {
    const { email, name } = extractUserFields(event.data);
    if (!email) {
      return new Response("No email on user", { status: 400 });
    }

    // Provision tenant + user row
    const [tenant] = await db
      .insert(tenants)
      .values({ name: "My Business" })
      .returning({ id: tenants.id });

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: event.data.id,
        tenantId: tenant.id,
        email,
        name,
        avatarUrl: event.data.image_url,
        role: "admin",
      })
      .returning({ id: users.id, tenantId: users.tenantId, role: users.role });

    // Write tenantId + role back to Clerk public metadata
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.updateUserMetadata(event.data.id, {
      publicMetadata: {
        tenantId: newUser.tenantId,
        role: newUser.role,
        dbUserId: newUser.id,
      },
    });
  }

  if (event.type === "user.updated") {
    const { email, name } = extractUserFields(event.data);

    await db
      .update(users)
      .set({
        ...(email ? { email } : {}),
        name,
        avatarUrl: event.data.image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, event.data.id));
  }

  if (event.type === "user.deleted") {
    // Keep row for audit trail; just clear the clerkId link
    await db
      .update(users)
      .set({ clerkId: null, updatedAt: new Date() })
      .where(eq(users.clerkId, event.data.id));
  }

  return new Response(null, { status: 200 });
}
