import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-compatible middleware (no Prisma imports).
// Route protection logic lives in authConfig.callbacks.authorized
// Full session validation with Prisma happens server-side in getCurrentUser()
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
