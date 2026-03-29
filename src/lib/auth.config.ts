import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (NO Prisma imports).
 * Used by middleware which runs in Edge Runtime on Vercel.
 * The full auth config with Prisma callbacks lives in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers are added in auth.ts (require Node.js runtime)
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Public routes
      const publicPaths = ["/login", "/register", "/forgot-password", "/api/auth"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;

      // API routes with their own auth
      if (pathname.startsWith("/api/cron") || pathname.startsWith("/api/pluggy")) return true;

      // Require session for everything else
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
