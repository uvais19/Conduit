import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV !== "production" ? "conduit-dev-secret" : undefined);

const protectedPrefixes = [
  "/dashboard",
  "/calendar",
  "/content",
  "/approval",
  "/analytics",
  "/strategy",
  "/brand",
  "/settings",
  "/onboarding",
];

const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const token = await getToken({
    req: request,
    secret: authSecret,
  });
  const isLoggedIn = Boolean(token);
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendar/:path*",
    "/content/:path*",
    "/approval/:path*",
    "/analytics/:path*",
    "/strategy/:path*",
    "/brand/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};
