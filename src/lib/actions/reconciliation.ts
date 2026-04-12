"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { autoReconcile, manualReconcile, approveReconciliation } from "@/lib/services/reconciliation";
import { normalizePagination, buildPaginatedResult, type PaginationParams } from "@/lib/utils/pagination";
import { reconciliationRateLimit } from "@/lib/middleware/rate-limit";

export async function runAutoReconciliation(bankAccountId: string) {
  const user = await getCurrentUser();
  reconciliationRateLimit(`reconcile:${user.tenantId}`);

  const result = await autoReconcile(user.tenantId, bankAccountId, user.id, user.email);
  revalidatePath("/reconciliation/bank");
  return result;
}

export async function reconcileManually(bankStatementLineId: string, officialEntryId: string | null, settlementId: string | null) {
  const user = await getCurrentUser();
  const result = await manualReconcile(
    user.tenantId,
    bankStatementLineId,
    officialEntryId,
    settlementId,
    user.id,
    user.email
  );
  revalidatePath("/reconciliation/bank");
  return result;
}

export async function undoReconciliation(reconciliationId: string) {
  const user = await getCurrentUser();

  await prisma.reconciliation.delete({
    where: { id: reconciliationId },
  });

  revalidatePath("/reconciliation/bank");
}

// RA04: Approve reconciliation that requires human review
export async function approveReconciliationAction(reconciliationId: string) {
  const user = await getCurrentUser();
  await approveReconciliation(reconciliationId, user.tenantId, user.id, user.email);
  revalidatePath("/reconciliation/bank");
}

// RA04: List reconciliations requiring review
export async function listReviewQueue(params?: {
  bankAccountId?: string;
  pagination?: PaginationParams;
}) {
  const user = await getCurrentUser();
  const { skip, take, page, pageSize } = normalizePagination(params?.pagination);

  const where = {
    tenantId: user.tenantId,
    requiresHumanReview: true as const,
    ...(params?.bankAccountId ? { bankStatementLine: { bankAccountId: params.bankAccountId } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.reconciliation.findMany({
      where,
      include: {
        bankStatementLine: { select: { transactionDate: true, description: true, amount: true } },
        officialEntry: { select: { description: true, amount: true, date: true } },
        settlement: { select: { amount: true, date: true } },
      },
      orderBy: { reconciledAt: "desc" },
      skip,
      take,
    }),
    prisma.reconciliation.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, pageSize);
}

export async function getReconciliationStatus(bankAccountId: string) {
  const user = await getCurrentUser();

  const [totalLines, reconciledLines] = await Promise.all([
    prisma.bankStatementLine.count({
      where: { tenantId: user.tenantId, bankAccountId },
    }),
    prisma.bankStatementLine.count({
      where: { tenantId: user.tenantId, bankAccountId, reconciliation: { isNot: null } },
    }),
  ]);

  return {
    total: totalLines,
    reconciled: reconciledLines,
    pending: totalLines - reconciledLines,
    percentage: totalLines > 0 ? Math.round((reconciledLines / totalLines) * 100) : 0,
  };
}
