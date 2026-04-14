"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentUser, requireRole, type SessionUser } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import type { Role } from "@/generated/prisma";

// ─── Company / Tenant Management ─────────────────────────────────────────────

/**
 * Creates a new tenant with default chart of accounts and auto-creates
 * an ADMIN membership for the current user.
 */
export async function createTenant(data: {
  name: string;
  cnpj: string;
  slug: string;
}) {
  const user = await requireRole(["ADMIN"]);

  const existing = await prisma.tenant.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new Error("Já existe uma empresa com esse slug");
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        slug: data.slug,
      },
    });

    // Auto-create ADMIN membership for current user
    await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: newTenant.id,
        role: "ADMIN",
        isDefault: false,
      },
    });

    // Create default chart of accounts (top-level groups — financial/managerial)
    const defaultAccounts = [
      { code: "1", name: "RECEITAS", type: "REVENUE" as const, level: 1 },
      { code: "2", name: "DEDUÇÕES E IMPOSTOS", type: "DEDUCTION" as const, level: 1 },
      { code: "3", name: "CUSTOS", type: "COST" as const, level: 1 },
      { code: "4", name: "DESPESAS OPERACIONAIS", type: "EXPENSE" as const, level: 1 },
      { code: "5", name: "INVESTIMENTOS E RETIRADAS", type: "INVESTMENT" as const, level: 1 },
    ];

    for (const account of defaultAccounts) {
      await tx.chartOfAccount.create({
        data: {
          tenantId: newTenant.id,
          code: account.code,
          name: account.name,
          type: account.type,
          level: account.level,
          isAnalytic: false,
        },
      });
    }

    return newTenant;
  });

  await createAuditLog({
    tenantId: tenant.id,
    tableName: "Tenant",
    recordId: tenant.id,
    action: "CREATE",
    newValues: { name: data.name, cnpj: data.cnpj, slug: data.slug },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/settings/companies");

  return tenant;
}

/**
 * Updates tenant fields. Verifies the user has ADMIN membership in the target tenant.
 */
export async function updateTenant(
  tenantId: string,
  data: {
    name?: string;
    cnpj?: string;
    active?: boolean;
    logoUrl?: string;
  }
) {
  const user = await requireRole(["ADMIN"]);

  // Verify ADMIN membership in target tenant
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Acesso negado: você não é administrador desta empresa");
  }

  const oldTenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
  });

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data,
  });

  await createAuditLog({
    tenantId,
    tableName: "Tenant",
    recordId: tenantId,
    action: "UPDATE",
    oldValues: { name: oldTenant.name, cnpj: oldTenant.cnpj, active: oldTenant.active, logoUrl: oldTenant.logoUrl },
    newValues: data,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/settings/companies");

  return updated;
}

/**
 * Returns all tenants the user belongs to with membership counts,
 * staging pending counts, and overdue counts.
 */
export async function listAllUserTenants() {
  const user = await getCurrentUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          cnpj: true,
          slug: true,
          active: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  const tenantIds = memberships.map((m) => m.tenantId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Efficient aggregation queries in parallel
  const [
    memberCounts,
    stagingPendingCounts,
    overdueCounts,
    unclassifiedCounts,
    staleStagingCounts,
    noCostCenterCounts,
  ] = await Promise.all([
    prisma.membership.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: { id: true },
    }),
    prisma.stagingEntry.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
      },
      _count: { id: true },
    }),
    prisma.officialEntry.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: "OPEN",
        dueDate: { lt: new Date() },
        category: { in: ["PAYABLE", "RECEIVABLE"] },
      },
      _count: { id: true },
    }),
    // Exception: staging sem classificação
    prisma.stagingEntry.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        chartOfAccountId: { equals: null },
        status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
      },
      _count: { id: true },
    }),
    // Exception: staging parado > 7 dias
    prisma.stagingEntry.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
        createdAt: { lt: sevenDaysAgo },
      },
      _count: { id: true },
    }),
    // Exception: lançamentos sem centro de custo
    prisma.officialEntry.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        costCenterId: { equals: null },
        status: { not: "CANCELLED" },
      },
      _count: { id: true },
    }),
  ]);

  const memberCountMap = Object.fromEntries(
    memberCounts.map((c) => [c.tenantId, c._count.id])
  );
  const stagingPendingMap = Object.fromEntries(
    stagingPendingCounts.map((c) => [c.tenantId, c._count.id])
  );
  const overdueMap = Object.fromEntries(
    overdueCounts.map((c) => [c.tenantId, c._count.id])
  );
  const unclassifiedMap = Object.fromEntries(
    unclassifiedCounts.map((c) => [c.tenantId, c._count.id])
  );
  const staleStagingMap = Object.fromEntries(
    staleStagingCounts.map((c) => [c.tenantId, c._count.id])
  );
  const noCostCenterMap = Object.fromEntries(
    noCostCenterCounts.map((c) => [c.tenantId, c._count.id])
  );

  return memberships.map((m) => {
    const unclassified = unclassifiedMap[m.tenantId] ?? 0;
    const staleStaging = staleStagingMap[m.tenantId] ?? 0;
    const noCostCenter = noCostCenterMap[m.tenantId] ?? 0;

    return {
      tenantId: m.tenantId,
      tenant: m.tenant,
      role: m.role,
      isDefault: m.isDefault,
      memberCount: memberCountMap[m.tenantId] ?? 0,
      stagingPendingCount: stagingPendingMap[m.tenantId] ?? 0,
      overdueCount: overdueMap[m.tenantId] ?? 0,
      exceptions: {
        unclassified,
        staleStaging,
        noCostCenter,
        total: unclassified + staleStaging + noCostCenter,
      },
    };
  });
}

/**
 * Returns detailed stats for a tenant. Verifies user membership.
 */
export async function getTenantStats(tenantId: string) {
  const user = await getCurrentUser();

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (!membership) {
    throw new Error("Você não tem acesso a essa empresa");
  }

  const now = new Date();

  const [
    memberCount,
    stagingPending,
    entriesCount,
    overduePayables,
    overdueReceivables,
    lastImport,
  ] = await Promise.all([
    prisma.membership.count({ where: { tenantId } }),
    prisma.stagingEntry.count({
      where: { tenantId, status: { in: ["PENDING", "AUTO_CLASSIFIED"] } },
    }),
    prisma.officialEntry.count({ where: { tenantId } }),
    prisma.officialEntry.count({
      where: {
        tenantId,
        status: "OPEN",
        category: "PAYABLE",
        dueDate: { lt: now },
      },
    }),
    prisma.officialEntry.count({
      where: {
        tenantId,
        status: "OPEN",
        category: "RECEIVABLE",
        dueDate: { lt: now },
      },
    }),
    prisma.importBatch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    memberCount,
    stagingPending,
    entriesCount,
    overduePayables,
    overdueReceivables,
    lastImportDate: lastImport?.createdAt ?? null,
  };
}

/**
 * Permanently deletes an inactive tenant and all its data (cascade).
 * Requires ADMIN membership in the target tenant.
 * Rules: company must be inactive, must not be current/default tenant,
 * must not be the user's only tenant, and must have no official entries.
 */
export async function deleteTenant(
  tenantId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireRole(["ADMIN"]);

    // Verify ADMIN membership in target tenant
    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return { ok: false, error: "Acesso negado: você não é administrador desta empresa" };
    }

    // Block if it's the user's current (default) tenant
    if (membership.isDefault) {
      return {
        ok: false,
        error: "Não é possível excluir a empresa ativa. Troque para outra empresa primeiro.",
      };
    }

    // Block if it's the user's only tenant
    const membershipCount = await prisma.membership.count({
      where: { userId: user.id },
    });
    if (membershipCount <= 1) {
      return { ok: false, error: "Não é possível excluir sua única empresa" };
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    // Must be inactive — deactivate first via Editar
    if (tenant.active) {
      return {
        ok: false,
        error: "Desative a empresa antes de excluir. Clique em Editar e desmarque 'Ativa'.",
      };
    }

    // Block if there are official financial entries (data loss prevention)
    const entriesCount = await prisma.officialEntry.count({ where: { tenantId } });
    if (entriesCount > 0) {
      return {
        ok: false,
        error: `Não é possível excluir: a empresa possui ${entriesCount} lançamento(s) financeiro(s).`,
      };
    }

    // Hard delete — all child models cascade from Tenant (onDelete: Cascade in schema)
    await prisma.tenant.delete({ where: { id: tenantId } });

    // Audit on current user's active tenant (deleted tenant no longer exists)
    await createAuditLog({
      tenantId: user.tenantId,
      tableName: "Tenant",
      recordId: tenantId,
      action: "DELETE",
      oldValues: { id: tenantId, name: tenant.name, active: false },
      newValues: null,
      userId: user.id,
      userEmail: user.email,
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/settings/companies");
    return { ok: true };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[deleteTenant]", err);
    return { ok: false, error: (err as Error).message ?? "Erro ao excluir empresa" };
  }
}

// ─── User / Invite Management ────────────────────────────────────────────────

/**
 * Lists all members of the current user's active tenant with user info.
 */
export async function listTenantMembers() {
  const user = await getCurrentUser();

  return prisma.membership.findMany({
    where: { tenantId: user.tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Invites a user to the current tenant. If user already exists in system,
 * adds membership directly. If already a member, throws error.
 * Creates TenantInvite with 7-day expiry for new users.
 */
export async function inviteUserToTenant(email: string, role: Role) {
  const user = await requireRole(["ADMIN"]);
  const tenantId = user.tenantId;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { tenantId },
      },
    },
  });

  if (existingUser?.memberships.length) {
    throw new Error("Este usuário já é membro desta empresa");
  }

  // If user exists in system, add membership directly
  if (existingUser) {
    const membership = await prisma.membership.create({
      data: {
        userId: existingUser.id,
        tenantId,
        role,
        isDefault: false,
      },
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: existingUser.id,
        tenantId,
        type: "INVITE_RECEIVED",
        title: "Novo acesso concedido",
        message: `Você foi adicionado à empresa como ${role}`,
        href: "/dashboard",
      },
    });

    await createAuditLog({
      tenantId,
      tableName: "Membership",
      recordId: membership.id,
      action: "CREATE",
      newValues: { email, role, directAdd: true },
      userId: user.id,
      userEmail: user.email,
    });

    revalidatePath("/admin/members");
    return { type: "direct" as const, membership };
  }

  // Check for existing pending invite
  const existingInvite = await prisma.tenantInvite.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (existingInvite && existingInvite.status === "PENDING") {
    throw new Error("Já existe um convite pendente para este email");
  }

  // Create or upsert invite with 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.tenantInvite.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      email,
      role,
      status: "PENDING",
      expiresAt,
      createdById: user.id,
    },
    update: {
      role,
      status: "PENDING",
      expiresAt,
      createdById: user.id,
    },
  });

  await createAuditLog({
    tenantId,
    tableName: "TenantInvite",
    recordId: invite.id,
    action: "CREATE",
    newValues: { email, role },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/admin/invites");
  return { type: "invite" as const, invite };
}

/**
 * Lists pending invites for the current tenant. ADMIN only.
 */
export async function listTenantInvites() {
  const user = await requireRole(["ADMIN"]);

  return prisma.tenantInvite.findMany({
    where: {
      tenantId: user.tenantId,
      status: "PENDING",
    },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Cancels a pending invite. ADMIN only.
 */
export async function cancelInvite(inviteId: string) {
  const user = await requireRole(["ADMIN"]);

  const invite = await prisma.tenantInvite.findUniqueOrThrow({
    where: { id: inviteId },
  });

  if (invite.tenantId !== user.tenantId) {
    throw new Error("Convite não pertence a esta empresa");
  }

  if (invite.status !== "PENDING") {
    throw new Error("Apenas convites pendentes podem ser cancelados");
  }

  const updated = await prisma.tenantInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "TenantInvite",
    recordId: inviteId,
    action: "UPDATE",
    oldValues: { status: "PENDING" },
    newValues: { status: "CANCELLED" },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/admin/invites");
  return updated;
}

/**
 * Accepts an invite by token. Creates membership for the current user.
 * Returns a result object instead of throwing so production builds
 * can surface the real validation message to the client.
 */
export async function acceptInvite(
  token: string
): Promise<
  | { ok: true; tenantName: string; additionalCount: number }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Você precisa estar logado para aceitar um convite" };
  }
  const user = session.user as SessionUser;

  try {
    const invite = await prisma.tenantInvite.findUnique({
      where: { token },
      include: { tenant: { select: { name: true } } },
    });

    if (!invite) {
      return { ok: false, error: "Convite não encontrado ou já expirado" };
    }

    if (invite.status !== "PENDING") {
      return { ok: false, error: "Este convite já foi utilizado ou cancelado" };
    }

    if (new Date() > invite.expiresAt) {
      await prisma.tenantInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return { ok: false, error: "Este convite expirou. Peça um novo convite ao administrador" };
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: invite.tenantId } },
    });
    if (existingMembership) {
      return { ok: false, error: "Você já é membro desta empresa" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: invite.tenantId,
          role: invite.role,
          isDefault: false,
        },
      });
      await tx.tenantInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      });
    });

    // Process additional companies bundled in a multi-company invite
    type ExtraItem = { tenantId: string; role: string };
    const extras = Array.isArray(invite.additionalTenants)
      ? (invite.additionalTenants as ExtraItem[]).filter(
          (e) => e && typeof e.tenantId === "string"
        )
      : [];

    if (extras.length > 0) {
      await Promise.allSettled(
        extras.map(({ tenantId, role }) =>
          prisma.membership.upsert({
            where: { userId_tenantId: { userId: user.id, tenantId } },
            create: { userId: user.id, tenantId, role: role as Role, isDefault: false },
            update: {}, // already a member — keep as-is
          })
        )
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings/users");

    return { ok: true, tenantName: invite.tenant.name, additionalCount: extras.length };
  } catch (err) {
    console.error("[acceptInvite]", err);
    return { ok: false, error: "Erro interno ao aceitar o convite. Tente novamente." };
  }
}

/**
 * Updates a member's role. ADMIN only. Cannot change own role.
 */
export async function updateMemberRole(membershipId: string, newRole: Role) {
  const user = await requireRole(["ADMIN"]);

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
  });

  if (membership.tenantId !== user.tenantId) {
    throw new Error("Membro não pertence a esta empresa");
  }

  if (membership.userId === user.id) {
    throw new Error("Você não pode alterar seu próprio cargo");
  }

  const oldRole = membership.role;

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Membership",
    recordId: membershipId,
    action: "UPDATE",
    oldValues: { role: oldRole },
    newValues: { role: newRole },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/admin/members");
  return updated;
}

/**
 * Removes a member from the tenant. ADMIN only. Cannot remove self.
 */
export async function removeMember(membershipId: string) {
  const user = await requireRole(["ADMIN"]);

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (membership.tenantId !== user.tenantId) {
    throw new Error("Membro não pertence a esta empresa");
  }

  if (membership.userId === user.id) {
    throw new Error("Você não pode remover a si mesmo da empresa");
  }

  await prisma.membership.delete({
    where: { id: membershipId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Membership",
    recordId: membershipId,
    action: "DELETE",
    oldValues: {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
    },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/admin/members");
}

// ─── Notifications ───────────────────────────────────────────────────────────

/**
 * Returns the last 50 notifications for the current user.
 */
export async function listNotifications() {
  const user = await getCurrentUser();

  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();

  const notification = await prisma.notification.findUniqueOrThrow({
    where: { id },
  });

  if (notification.userId !== user.id) {
    throw new Error("Notificação não pertence a este usuário");
  }

  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

/**
 * Marks all notifications as read for the current user.
 */
export async function markAllNotificationsRead() {
  const user = await getCurrentUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/dashboard");
}

/**
 * Returns the count of unread notifications.
 */
export async function getUnreadNotificationCount() {
  const user = await getCurrentUser();

  return prisma.notification.count({
    where: { userId: user.id, read: false },
  });
}

/**
 * Checks all user's tenants for actionable items and creates notifications.
 * Checks: pending staging entries, overdue payables, overdue receivables.
 * Meant to be called periodically or on dashboard load.
 */
export async function generateCrossTenantNotifications() {
  const user = await getCurrentUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { tenantId: true, tenant: { select: { name: true } } },
  });

  const tenantIds = memberships.map((m) => m.tenantId);
  const tenantNameMap = Object.fromEntries(
    memberships.map((m) => [m.tenantId, m.tenant.name])
  );

  const now = new Date();
  const notifications: Array<{
    userId: string;
    tenantId: string;
    type: "STAGING_PENDING" | "OVERDUE_PAYABLE" | "OVERDUE_RECEIVABLE";
    title: string;
    message: string;
    href: string;
  }> = [];

  // Aggregate counts across all tenants
  const [stagingCounts, overduePayableCounts, overdueReceivableCounts] =
    await Promise.all([
      prisma.stagingEntry.groupBy({
        by: ["tenantId"],
        where: {
          tenantId: { in: tenantIds },
          status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
        },
        _count: { id: true },
      }),
      prisma.officialEntry.groupBy({
        by: ["tenantId"],
        where: {
          tenantId: { in: tenantIds },
          status: "OPEN",
          category: "PAYABLE",
          dueDate: { lt: now },
        },
        _count: { id: true },
      }),
      prisma.officialEntry.groupBy({
        by: ["tenantId"],
        where: {
          tenantId: { in: tenantIds },
          status: "OPEN",
          category: "RECEIVABLE",
          dueDate: { lt: now },
        },
        _count: { id: true },
      }),
    ]);

  // Check for recent duplicate notifications (last 24h) to avoid spamming
  const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentNotifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: recentCutoff },
      type: { in: ["STAGING_PENDING", "OVERDUE_PAYABLE", "OVERDUE_RECEIVABLE"] },
    },
    select: { tenantId: true, type: true },
  });

  const recentSet = new Set(
    recentNotifications.map((n) => `${n.tenantId}:${n.type}`)
  );

  for (const sc of stagingCounts) {
    if (sc._count.id > 0 && !recentSet.has(`${sc.tenantId}:STAGING_PENDING`)) {
      notifications.push({
        userId: user.id,
        tenantId: sc.tenantId,
        type: "STAGING_PENDING",
        title: `Lançamentos pendentes - ${tenantNameMap[sc.tenantId]}`,
        message: `Existem ${sc._count.id} lançamentos aguardando validação`,
        href: "/staging",
      });
    }
  }

  for (const op of overduePayableCounts) {
    if (op._count.id > 0 && !recentSet.has(`${op.tenantId}:OVERDUE_PAYABLE`)) {
      notifications.push({
        userId: user.id,
        tenantId: op.tenantId,
        type: "OVERDUE_PAYABLE",
        title: `Contas a pagar vencidas - ${tenantNameMap[op.tenantId]}`,
        message: `Existem ${op._count.id} contas a pagar vencidas`,
        href: "/financial/payables",
      });
    }
  }

  for (const or of overdueReceivableCounts) {
    if (or._count.id > 0 && !recentSet.has(`${or.tenantId}:OVERDUE_RECEIVABLE`)) {
      notifications.push({
        userId: user.id,
        tenantId: or.tenantId,
        type: "OVERDUE_RECEIVABLE",
        title: `Contas a receber vencidas - ${tenantNameMap[or.tenantId]}`,
        message: `Existem ${or._count.id} contas a receber vencidas`,
        href: "/financial/receivables",
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications,
    });
  }

  revalidatePath("/dashboard");

  return { created: notifications.length };
}

// ─── User Registration ────────────────────────────────────────────────────────

/**
 * Registers a new user account. If an inviteToken is provided and valid,
 * the user is immediately added as a member of the invited tenant.
 */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  inviteToken?: string;
}) {
  if (!data.name?.trim()) throw new Error("Nome é obrigatório");
  if (!data.email?.trim()) throw new Error("Email é obrigatório");
  if (!data.password || data.password.length < 8)
    throw new Error("Senha deve ter pelo menos 8 caracteres");

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Já existe uma conta com este email");

  const hashedPassword = await hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      hashedPassword,
    },
  });

  // Accept invite if token was provided
  if (data.inviteToken) {
    const invite = await prisma.tenantInvite.findUnique({
      where: { token: data.inviteToken },
      include: { tenant: { select: { name: true } } },
    });

    if (invite && invite.status === "PENDING" && new Date() <= invite.expiresAt) {
      await prisma.$transaction([
        prisma.membership.create({
          data: {
            userId: user.id,
            tenantId: invite.tenantId,
            role: invite.role,
            isDefault: true,
          },
        }),
        prisma.tenantInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" },
        }),
      ]);
    }
  }

  return { userId: user.id };
}

/**
 * Returns the invite details for a given token (public — no auth required).
 * Used to display who invited the user before they register/login.
 */
export async function getInviteDetails(token: string) {
  const invite = await prisma.tenantInvite.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) return null;
  if (invite.status !== "PENDING") return { expired: true as const, status: invite.status };
  if (new Date() > invite.expiresAt) return { expired: true as const, status: "EXPIRED" as const };

  return {
    expired: false as const,
    tenantName: invite.tenant.name,
    role: invite.role,
    invitedBy: invite.createdBy?.name ?? invite.createdBy?.email ?? "Administrador",
    email: invite.email,
  };
}

// ─── Cross-Tenant Access Management ──────────────────────────────────────────

/**
 * Helper — verifies that the current user has ADMIN role in a specific tenant.
 * Used by all cross-tenant mutation actions.
 */
async function requireAdminInTenant(targetTenantId: string) {
  const user = await getCurrentUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: targetTenantId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Acesso negado: você não é administrador desta empresa");
  }
  return user;
}

/**
 * Returns all tenants where the current user is ADMIN, with their full member
 * list and pending invites — in a single efficient load (3 DB queries total).
 * Used by the centralized /settings/access page.
 */
export async function listAllAdminTenantData() {
  const user = await getCurrentUser();

  // All tenants where user is ADMIN
  const adminMemberships = await prisma.membership.findMany({
    where: { userId: user.id, role: "ADMIN" },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, active: true },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  const adminTenantIds = adminMemberships.map((m) => m.tenantId);
  if (adminTenantIds.length === 0) return [];

  // Batch-fetch members + pending invites for all admin tenants in parallel
  const [allMembers, allInvites] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId: { in: adminTenantIds } },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tenantInvite.findMany({
      where: { tenantId: { in: adminTenantIds }, status: "PENDING" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Group by tenantId
  const membersByTenant: Record<string, typeof allMembers> = {};
  const invitesByTenant: Record<string, typeof allInvites> = {};

  for (const m of allMembers) {
    if (!membersByTenant[m.tenantId]) membersByTenant[m.tenantId] = [];
    membersByTenant[m.tenantId].push(m);
  }
  for (const i of allInvites) {
    if (!invitesByTenant[i.tenantId]) invitesByTenant[i.tenantId] = [];
    invitesByTenant[i.tenantId].push(i);
  }

  return adminMemberships.map((m) => ({
    tenantId: m.tenantId,
    tenant: m.tenant,
    isCurrentTenant: m.isDefault,
    members: membersByTenant[m.tenantId] ?? [],
    invites: invitesByTenant[m.tenantId] ?? [],
  }));
}

/**
 * Cross-tenant version of inviteUserToTenant.
 * Accepts an explicit tenantId. Verifies caller is ADMIN in that tenant.
 */
export async function inviteUserToTenantById(
  tenantId: string,
  email: string,
  role: Role
) {
  const user = await requireAdminInTenant(tenantId);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { tenantId } } },
  });

  if (existingUser?.memberships.length) {
    throw new Error("Este usuário já é membro desta empresa");
  }

  if (existingUser) {
    const membership = await prisma.membership.create({
      data: { userId: existingUser.id, tenantId, role, isDefault: false },
    });

    await prisma.notification.create({
      data: {
        userId: existingUser.id,
        tenantId,
        type: "INVITE_RECEIVED",
        title: "Novo acesso concedido",
        message: `Você foi adicionado à empresa como ${role}`,
        href: "/dashboard",
      },
    });

    await createAuditLog({
      tenantId,
      tableName: "Membership",
      recordId: membership.id,
      action: "CREATE",
      newValues: { email, role, directAdd: true },
      userId: user.id,
      userEmail: user.email,
    });

    revalidatePath("/settings/access");
    revalidatePath("/settings/users");
    return { type: "direct" as const, membership };
  }

  const existingInvite = await prisma.tenantInvite.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (existingInvite && existingInvite.status === "PENDING") {
    throw new Error("Já existe um convite pendente para este email");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.tenantInvite.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: { tenantId, email, role, status: "PENDING", expiresAt, createdById: user.id },
    update: { role, status: "PENDING", expiresAt, createdById: user.id },
  });

  await createAuditLog({
    tenantId,
    tableName: "TenantInvite",
    recordId: invite.id,
    action: "CREATE",
    newValues: { email, role },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/settings/access");
  revalidatePath("/settings/users");
  return { type: "invite" as const, invite };
}

/**
 * Cross-tenant version of updateMemberRole.
 * Accepts an explicit tenantId. Verifies caller is ADMIN in that tenant.
 */
export async function updateMemberRoleById(
  membershipId: string,
  newRole: Role,
  tenantId: string
) {
  const user = await requireAdminInTenant(tenantId);

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
  });

  if (membership.tenantId !== tenantId) {
    throw new Error("Membro não pertence a esta empresa");
  }
  if (membership.userId === user.id) {
    throw new Error("Você não pode alterar seu próprio cargo");
  }

  const oldRole = membership.role;
  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });

  await createAuditLog({
    tenantId,
    tableName: "Membership",
    recordId: membershipId,
    action: "UPDATE",
    oldValues: { role: oldRole },
    newValues: { role: newRole },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/settings/access");
  revalidatePath("/settings/users");
  return updated;
}

/**
 * Cross-tenant version of removeMember.
 * Accepts an explicit tenantId. Verifies caller is ADMIN in that tenant.
 */
export async function removeMemberById(membershipId: string, tenantId: string) {
  const user = await requireAdminInTenant(tenantId);

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });

  if (membership.tenantId !== tenantId) {
    throw new Error("Membro não pertence a esta empresa");
  }
  if (membership.userId === user.id) {
    throw new Error("Você não pode remover a si mesmo da empresa");
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  await createAuditLog({
    tenantId,
    tableName: "Membership",
    recordId: membershipId,
    action: "DELETE",
    oldValues: {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
    },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/settings/access");
  revalidatePath("/settings/users");
}

/**
 * Cross-tenant version of cancelInvite.
 * Accepts an explicit tenantId. Verifies caller is ADMIN in that tenant.
 */
export async function cancelInviteById(inviteId: string, tenantId: string) {
  const user = await requireAdminInTenant(tenantId);

  const invite = await prisma.tenantInvite.findUniqueOrThrow({
    where: { id: inviteId },
  });

  if (invite.tenantId !== tenantId) {
    throw new Error("Convite não pertence a esta empresa");
  }
  if (invite.status !== "PENDING") {
    throw new Error("Apenas convites pendentes podem ser cancelados");
  }

  const updated = await prisma.tenantInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    tenantId,
    tableName: "TenantInvite",
    recordId: inviteId,
    action: "UPDATE",
    oldValues: { status: "PENDING" },
    newValues: { status: "CANCELLED" },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/settings/access");
  revalidatePath("/settings/users");
  return updated;
}

/**
 * Invite a single user to MULTIPLE tenants at once.
 *
 * If the user already has an account → adds them directly to every selected company.
 * If the user is new → creates ONE TenantInvite (primary company) with the remaining
 * companies stored in `additionalTenants`. Accepting the single link creates all
 * memberships at once.
 */
export async function inviteUserToMultipleTenants(
  email: string,
  selections: { tenantId: string; role: Role }[]
): Promise<
  | { type: "direct"; count: number }
  | { type: "invite"; invite: { token: string } }
> {
  if (!selections.length) throw new Error("Selecione ao menos uma empresa");

  // Verify caller is ADMIN in every selected tenant
  const user = await getCurrentUser();
  await Promise.all(selections.map(({ tenantId }) => requireAdminInTenant(tenantId)));

  // Check whether this email belongs to an existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { tenantId: { in: selections.map((s) => s.tenantId) } },
        select: { tenantId: true },
      },
    },
  });

  if (existingUser) {
    // Direct add — skip tenants where the user is already a member
    const alreadyIn = new Set(existingUser.memberships.map((m) => m.tenantId));
    const toAdd = selections.filter((s) => !alreadyIn.has(s.tenantId));

    if (!toAdd.length) {
      throw new Error("Este usuário já é membro de todas as empresas selecionadas");
    }

    await prisma.$transaction(async (tx) => {
      for (const { tenantId, role } of toAdd) {
        await tx.membership.create({
          data: { userId: existingUser.id, tenantId, role, isDefault: false },
        });
        await tx.notification.create({
          data: {
            userId: existingUser.id,
            tenantId,
            type: "INVITE_RECEIVED",
            title: "Novo acesso concedido",
            message: `Você foi adicionado à empresa como ${role}`,
            href: "/dashboard",
          },
        });
      }
    });

    await Promise.allSettled(
      toAdd.map(({ tenantId, role }) =>
        createAuditLog({
          tenantId,
          tableName: "Membership",
          recordId: email,
          action: "CREATE",
          newValues: { email, role, directAdd: true },
          userId: user.id,
          userEmail: user.email,
        })
      )
    );

    revalidatePath("/settings/access");
    revalidatePath("/settings/users");
    return { type: "direct", count: toAdd.length };
  }

  // New user — create ONE invite: primary company + extras in additionalTenants
  const [primary, ...rest] = selections;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const existing = await prisma.tenantInvite.findUnique({
    where: { tenantId_email: { tenantId: primary.tenantId, email } },
  });
  if (existing?.status === "PENDING") {
    throw new Error("Já existe um convite pendente para este email nesta empresa");
  }

  const additionalTenants = rest.length
    ? rest.map((s) => ({ tenantId: s.tenantId, role: s.role }))
    : undefined;

  const invite = await prisma.tenantInvite.upsert({
    where: { tenantId_email: { tenantId: primary.tenantId, email } },
    create: {
      tenantId: primary.tenantId,
      email,
      role: primary.role,
      status: "PENDING",
      expiresAt,
      createdById: user.id,
      additionalTenants: additionalTenants ?? [],
    },
    update: {
      role: primary.role,
      status: "PENDING",
      expiresAt,
      createdById: user.id,
      additionalTenants: additionalTenants ?? [],
    },
  });

  await createAuditLog({
    tenantId: primary.tenantId,
    tableName: "TenantInvite",
    recordId: invite.id,
    action: "CREATE",
    newValues: { email, role: primary.role, additionalCount: rest.length },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/settings/access");
  revalidatePath("/settings/users");
  return { type: "invite", invite: { token: invite.token } };
}
