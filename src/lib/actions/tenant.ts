"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";

/**
 * List all tenants the current user has access to via memberships
 */
export async function listUserTenants() {
  const user = await getCurrentUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      tenant: {
        select: { id: true, name: true, cnpj: true, slug: true, active: true },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  return memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantCnpj: m.tenant.cnpj,
    tenantSlug: m.tenant.slug,
    role: m.role,
    isDefault: m.isDefault,
    active: m.tenant.active,
  }));
}

/**
 * Switch the current user's active tenant.
 * Updates isDefault on memberships and forces session refresh.
 */
export async function switchTenant(tenantId: string) {
  const user = await getCurrentUser();

  // Verify user has membership in target tenant
  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId,
      },
    },
    include: { tenant: { select: { active: true, name: true } } },
  });

  if (!targetMembership) {
    throw new Error("Você não tem acesso a essa empresa");
  }

  if (!targetMembership.tenant.active) {
    throw new Error("Esta empresa está desativada");
  }

  // Already the default? No-op
  if (targetMembership.isDefault) {
    return { tenantName: targetMembership.tenant.name };
  }

  // Transaction: unset current default, set new default
  await prisma.$transaction([
    // Remove isDefault from all user memberships
    prisma.membership.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    // Set new default
    prisma.membership.update({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      data: { isDefault: true },
    }),
  ]);

  // Revalidate everything — tenant context changed
  revalidatePath("/", "layout");

  return { tenantName: targetMembership.tenant.name };
}
