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

      // Public routes — exact match to prevent path confusion attacks
      const publicPaths = ["/login", "/register", "/forgot-password"];
      if (publicPaths.includes(pathname)) return true;
      // Invite acceptance page is public (token validates access)
      if (pathname.startsWith("/invite/")) return true;
      // NextAuth API routes need prefix matching but are scoped
      if (pathname.startsWith("/api/auth/")) return true;

      // API routes with their own auth
      if (pathname.startsWith("/api/cron") || pathname.startsWith("/api/pluggy")) return true;

      // Require session for everything else
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
