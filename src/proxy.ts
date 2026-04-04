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
    // Next internals + favicon only. Do not exclude paths just because they contain
    // a dot (e.g. `/api/media/local/.../file.svg`) — that skipped Clerk and broke
    // authenticated `<img>` requests.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
