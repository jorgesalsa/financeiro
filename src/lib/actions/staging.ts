"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import { validateStagingEntry, incorporateStagingEntries, assertValidTransition } from "@/lib/services/staging";
import { stagingEntrySchema, type StagingEntryInput } from "@/lib/validations/staging";
import { normalizePagination, buildPaginatedResult, type PaginationParams } from "@/lib/utils/pagination";
import { stagingBatchRateLimit } from "@/lib/middleware/rate-limit";

export async function listStagingEntries(params?: {
  status?: string;
  pagination?: PaginationParams;
}) {
  const user = await getCurrentUser();
  const { skip, take, page, pageSize } = normalizePagination(params?.pagination);

  const where = {
    tenantId: user.tenantId,
    ...(params?.status ? { status: params.status as any } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.stagingEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        chartOfAccount: { select: { code: true, name: true } },
        costCenter: { select: { code: true, name: true } },
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
        bankAccount: { select: { bankName: true, accountNumber: true } },
      },
      skip,
      take,
    }),
    prisma.stagingEntry.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, pageSize);
}

export async function getStagingStatusCounts() {
  const user = await getCurrentUser();
  const counts = await prisma.stagingEntry.groupBy({
    by: ["status"],
    where: { tenantId: user.tenantId },
    _count: { status: true },
  });

  const result: Record<string, number> = {};
  let allCount = 0;
  for (const row of counts) {
    result[row.status] = row._count.status;
    allCount += row._count.status;
  }
  result.ALL = allCount;
  return result;
}

export async function createStagingEntry(data: StagingEntryInput) {
  const user = await getCurrentUser();
  const validated = stagingEntrySchema.parse(data);

  const { pendingSettlement, ...restFields } = validated;
  const entry = await prisma.stagingEntry.create({
    data: {
      ...restFields,
      ...(pendingSettlement != null ? { pendingSettlement } : {}),
      tenantId: user.tenantId,
      source: "MANUAL",
      status: "PENDING",
      createdById: user.id,
    } as any,
  });

  revalidatePath("/staging");
  return entry;
}

export async function updateStagingEntry(id: string, data: StagingEntryInput) {
  const user = await getCurrentUser();
  const validated = stagingEntrySchema.parse(data);

  // RA02: Allow editing in more states
  const existing = await prisma.stagingEntry.findFirstOrThrow({
    where: { id, tenantId: user.tenantId, status: { in: ["PENDING", "PARSED", "NORMALIZED", "AUTO_CLASSIFIED", "CONFLICT"] } },
  });

  const { pendingSettlement: ps, ...updateFields } = validated;
  const entry = await prisma.stagingEntry.update({
    where: { id },
    data: {
      ...updateFields,
      ...(ps != null ? { pendingSettlement: ps } : {}),
    } as any,
  });

  revalidatePath("/staging");
  return entry;
}

export async function validateEntries(ids: string[]) {
  const user = await getCurrentUser();
  const results = [];

  for (const id of ids) {
    const result = await validateStagingEntry(id, user.tenantId, user.id, user.email);
    results.push({ id, ...result });
  }

  revalidatePath("/staging");
  return results;
}

// BUG-10 FIX: Use state machine for reject transitions
export async function rejectStagingEntry(id: string, reason: string) {
  const user = await getCurrentUser();

  const entry = await prisma.stagingEntry.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  // Validate state machine transition
  assertValidTransition(entry.status, "REJECTED");

  await prisma.stagingEntry.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: reason },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "StagingEntry",
    recordId: id,
    action: "UPDATE",
    oldValues: { status: entry.status },
    newValues: { status: "REJECTED", rejectionReason: reason },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/staging");
}

export async function incorporateEntries(ids: string[]) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  stagingBatchRateLimit(`staging-batch:${user.tenantId}`);

  const results = await incorporateStagingEntries(ids, user.tenantId, user.id, user.email);
  revalidatePath("/staging");
  revalidatePath("/financial/entries");
  return results;
}
