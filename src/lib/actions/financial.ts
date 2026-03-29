"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { settleEntry } from "@/lib/services/settlement";
import { generateInstallments } from "@/lib/services/installment";
import { settlementSchema, installmentSchema } from "@/lib/validations/financial";

export async function listOfficialEntries(filters?: {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const user = await getCurrentUser();

  const where: any = { tenantId: user.tenantId };
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = new Date(filters.startDate);
    if (filters.endDate) where.date.lte = new Date(filters.endDate);
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

export async function settleOfficialEntry(data: {
  officialEntryId: string;
  date: string;
  settlementDate?: string; // RA01
  amount: number;
  interestAmount?: number;
  fineAmount?: number;
  discountAmount?: number;
  bankAccountId: string;
  paymentMethodId?: string;
  document?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();

  const result = await settleEntry({
    tenantId: user.tenantId,
    officialEntryId: data.officialEntryId,
    date: new Date(data.date),
    // RA01: Pass settlement date
    settlementDate: data.settlementDate ? new Date(data.settlementDate) : null,
    amount: data.amount,
    interestAmount: data.interestAmount,
    fineAmount: data.fineAmount,
    discountAmount: data.discountAmount,
    bankAccountId: data.bankAccountId,
    paymentMethodId: data.paymentMethodId || null,
    document: data.document || null,
    notes: data.notes || null,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/entries");
  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");
  return result;
}

export async function createInstallments(data: {
  officialEntryId: string;
  numberOfInstallments: number;
  firstDueDate: string;
  intervalDays: number;
}) {
  const user = await getCurrentUser();

  const result = await generateInstallments({
    tenantId: user.tenantId,
    officialEntryId: data.officialEntryId,
    numberOfInstallments: data.numberOfInstallments,
    firstDueDate: new Date(data.firstDueDate),
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

  revalidatePath("/financial/entries");
  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");
}
