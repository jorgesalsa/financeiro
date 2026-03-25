"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { autoReconcile, manualReconcile } from "@/lib/services/reconciliation";

export async function runAutoReconciliation(bankAccountId: string) {
  const user = await getCurrentUser();
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
