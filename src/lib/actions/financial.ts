"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { settleEntry } from "@/lib/services/settlement";
import { generateInstallments } from "@/lib/services/installment";
import { settlementSchema, installmentSchema } from "@/lib/validations/financial";
import { createAuditLog } from "@/lib/utils/audit";
import type { Prisma } from "@/generated/prisma";

export async function listOfficialEntries(filters?: {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const user = await getCurrentUser();

  const where: Prisma.OfficialEntryWhereInput = { tenantId: user.tenantId };
  if (filters?.category) where.category = filters.category as any;
  if (filters?.status) where.status = filters.status as any;
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters?.startDate) where.date.gte = new Date(filters.startDate);
    if (filters?.endDate) where.date.lte = new Date(filters.endDate);
  }

  return prisma.officialEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      costCenter: { select: { code: true, name: true } },
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
      bankAccount: { select: { bankName: true } },
      settlements: { select: { id: true, amount: true, date: true } },
    },
    take: 200,
  });
}

export async function settleOfficialEntry(rawData: unknown) {
  const user = await getCurrentUser();

  // SECURITY: Validate input with Zod before processing
  const data = settlementSchema.parse(rawData);

  const result = await settleEntry({
    tenantId: user.tenantId,
    officialEntryId: data.officialEntryId,
    date: data.date,
    settlementDate: data.settlementDate ?? null,
    amount: data.amount,
    interestAmount: data.interestAmount,
    fineAmount: data.fineAmount,
    discountAmount: data.discountAmount,
    bankAccountId: data.bankAccountId,
    paymentMethodId: data.paymentMethodId ?? null,
    document: data.document ?? null,
    notes: data.notes ?? null,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/entries");
  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");
  return result;
}

export async function createInstallments(rawData: unknown) {
  const user = await getCurrentUser();

  // SECURITY: Validate input with Zod before processing
  const data = installmentSchema.parse(rawData);

  const result = await generateInstallments({
    tenantId: user.tenantId,
    officialEntryId: data.officialEntryId,
    numberOfInstallments: data.numberOfInstallments,
    firstDueDate: data.firstDueDate,
    intervalDays: data.intervalDays,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/entries");
  revalidatePath("/financial/installments");
  return result;
}

// BUG-08 FIX: Reverse bank balance when cancelling settled/partial entries
export async function cancelEntry(id: string) {
  const user = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    const entry = await tx.officialEntry.findFirstOrThrow({
      where: { id, tenantId: user.tenantId },
      include: { settlements: true },
    });

    // Reverse each settlement's bank balance impact
    for (const settlement of entry.settlements) {
      const paymentAmount =
        Number(settlement.amount) +
        Number(settlement.interestAmount ?? 0) +
        Number(settlement.fineAmount ?? 0) -
        Number(settlement.discountAmount ?? 0);

      // Reverse: if PAYABLE had decremented, now increment back (and vice versa)
      const reverseChange =
        entry.category === "PAYABLE" ? paymentAmount : -paymentAmount;

      await tx.bankAccount.update({
        where: { id: settlement.bankAccountId },
        data: { currentBalance: { increment: reverseChange } },
      });
    }

    // Delete settlements
    if (entry.settlements.length > 0) {
      await tx.settlement.deleteMany({
        where: { officialEntryId: id },
      });
    }

    // Cancel the entry and reset payment fields
    await tx.officialEntry.update({
      where: { id },
      data: {
        status: "CANCELLED",
        paidAmount: 0,
        paidDate: null,
        interestAmount: 0,
        fineAmount: 0,
        discountAmount: 0,
      },
    });
  });

  // SECURITY: Audit log for cancellation
  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "OfficialEntry",
    recordId: id,
    action: "UPDATE",
    oldValues: { status: "OPEN/PARTIAL/SETTLED" },
    newValues: { status: "CANCELLED", settlementsReversed: true },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/entries");
  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");
}
