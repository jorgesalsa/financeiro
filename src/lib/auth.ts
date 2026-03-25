import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/db";
import type { Role } from "@/generated/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No PrismaAdapter needed — we only use Credentials + JWT
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { isDefault: true },
              include: { tenant: true },
              take: 1,
            },
          },
        });

        if (!user || !user.hashedPassword) return null;

        const isPasswordValid = await compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      if (token.id) {
        const membership = await prisma.membership.findFirst({
          where: { userId: token.id as string, isDefault: true },
          include: { tenant: true },
        });
        if (membership) {
          token.tenantId = membership.tenantId;
          token.tenantSlug = membership.tenant.slug;
          token.memberRole = membership.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as Role;
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).tenantSlug = token.tenantSlug as string;
        (session.user as any).memberRole = token.memberRole as Role;
      }
      return session;
    },
  },
});
