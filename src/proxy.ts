import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/calendar(.*)",
  "/content(.*)",
  "/approval(.*)",
  "/analytics(.*)",
  "/strategy(.*)",
  "/brand(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
]);

const isAuthRoute = createRouteMatcher(["/login(.*)", "/register(.*)"]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  if (isAuthRoute(request)) {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
});

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
