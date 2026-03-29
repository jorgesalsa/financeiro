import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes - no auth check needed
  const publicPaths = ["/login", "/register", "/forgot-password", "/api/auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes with their own auth (cron, webhooks)
  if (pathname.startsWith("/api/cron") || pathname.startsWith("/api/pluggy")) {
    return NextResponse.next();
  }

  // If no valid session, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session has required tenant data
  const user = req.auth.user as any;
  if (!user?.tenantId) {
    // User exists but has no tenant — redirect to onboarding
    if (!pathname.startsWith("/settings/companies/onboarding")) {
      return NextResponse.redirect(new URL("/settings/companies/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
