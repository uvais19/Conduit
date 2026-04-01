import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV !== "production" ? "conduit-dev-secret" : undefined);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const [dbUser] = await db
          .select({
            id: users.id,
            role: users.role,
            tenantId: users.tenantId,
          })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (dbUser) {
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth (Google), create user + tenant if first time
      if (account?.provider === "google" && user.email) {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (!existing) {
          // Create tenant and user on first OAuth sign-in
          const [tenant] = await db
            .insert(tenants)
            .values({ name: user.name || "My Business" })
            .returning();

          await db.insert(users).values({
            tenantId: tenant.id,
            email: user.email,
            name: user.name || "User",
            avatarUrl: user.image,
            role: "admin",
            emailVerified: new Date(),
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
