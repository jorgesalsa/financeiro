import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma";
import { cache } from "react";
import prisma from "@/lib/db";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
  memberRole: Role;
};

/**
 * Re-reads the current active membership from the DB for the given user.
 *
 * Priority: membership with isDefault=true → any membership (edge-case fallback
 * for users whose membership was created with isDefault=false, e.g. via direct
 * invite of an existing user).
 *
 * Using React's cache() deduplicates calls within the same React render cycle:
 * page.tsx files that call multiple data-fetching server actions in parallel
 * (via Promise.all) share a single DB round-trip.
 *
 * SECURITY: The JWT tenantId can become stale after a tenant switch. Always
 * reading from DB prevents cross-tenant data leakage.
 */
const getDefaultMembership = cache(async (userId: string) => {
  // Try the explicitly-defaulted membership first
  const defaultMembership = await prisma.membership.findFirst({
    where: { userId, isDefault: true },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { slug: true } },
    },
  });
  if (defaultMembership) return defaultMembership;

  // Safety-net: user has memberships but none is marked isDefault=true.
  // (happens when an existing user is invited directly — membership is created
  // with isDefault=false and they have no other company). Return the first one
  // so the app stays functional instead of redirecting to login.
  return prisma.membership.findFirst({
    where: { userId },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { slug: true } },
    },
  });
});

export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tokenUser = session.user as SessionUser;

  // Always re-verify tenantId from DB — the JWT tenantId may be stale after
  // a tenant switch (race condition between update() and navigation).
  // cache() deduplicates this query within the same React render cycle.
  const membership = await getDefaultMembership(tokenUser.id);
  if (!membership) redirect("/login");

  return {
    ...tokenUser,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    memberRole: membership.role as Role,
  };
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!allowedRoles.includes(user.memberRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  return user;
}
