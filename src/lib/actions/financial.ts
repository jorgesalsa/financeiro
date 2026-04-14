"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { settleEntry } from "@/lib/services/settlement";
import { generateInstallments } from "@/lib/services/installment";
import { settlementSchema, installmentSchema } from "@/lib/validations/financial";
import { createAuditLog } from "@/lib/utils/audit";
import { normalizePagination, buildPaginatedResult, type PaginationParams } from "@/lib/utils/pagination";
import type { Prisma } from "@/generated/prisma";

export async function listOfficialEntries(filters?: {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  pagination?: PaginationParams;
}) {
  const user = await getCurrentUser();
  const { skip, take, page, pageSize } = normalizePagination(filters?.pagination);

  const where: Prisma.OfficialEntryWhereInput = { tenantId: user.tenantId };
  if (filters?.category) where.category = filters.category as any;
  if (filters?.status) where.status = filters.status as any;
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    // Parse startDate as UTC start-of-day (e.g. "2026-04-01" → 2026-04-01T00:00:00.000Z)
    if (filters?.startDate) where.date.gte = new Date(filters.startDate + "T00:00:00.000Z");
    // Parse endDate as UTC end-of-day so the entire day is included
    if (filters?.endDate) where.date.lte = new Date(filters.endDate + "T23:59:59.999Z");
  }

  const [data, total] = await Promise.all([
    prisma.officialEntry.findMany({
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
      skip,
      take,
    }),
    prisma.officialEntry.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, pageSize);
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

/**
 * Quick-pay: settles an entry for its full remaining amount.
 * Uses today's date, the first active bank account, and no fees/discounts.
 */
export async function quickPayEntry(entryId: string) {
  const user = await getCurrentUser();

  const entry = await prisma.officialEntry.findFirst({
    where: { id: entryId, tenantId: user.tenantId },
    select: { id: true, amount: true, paidAmount: true, status: true },
  });

  if (!entry) throw new Error("Lancamento nao encontrado");
  if (entry.status === "SETTLED" || entry.status === "CANCELLED") {
    throw new Error("Lancamento ja esta quitado ou cancelado");
  }

  const remaining = Number(entry.amount) - Number(entry.paidAmount ?? 0);
  if (remaining <= 0) throw new Error("Nao ha saldo a pagar");

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { tenantId: user.tenantId, active: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!bankAccount) {
    throw new Error("Nenhuma conta bancaria ativa. Cadastre uma conta antes de efetuar pagamentos.");
  }

  const today = new Date();

  const result = await settleEntry({
    tenantId: user.tenantId,
    officialEntryId: entryId,
    date: today,
    settlementDate: today,
    amount: remaining,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    bankAccountId: bankAccount.id,
    paymentMethodId: null,
    document: null,
    notes: "Pagamento rapido",
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");
  revalidatePath("/financial/entries");
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

/**
 * Create an OfficialEntry directly (skip staging).
 * Requires ADMIN or CONTROLLER role.
 */
export async function createDirectOfficialEntry(data: {
  date: string;
  competenceDate?: string;
  description: string;
  amount: number;
  transactionType: "CREDIT" | "DEBIT";
  category: "PAYABLE" | "RECEIVABLE" | "TRANSFER" | "ADJUSTMENT";
  chartOfAccountId: string;
  bankAccountId: string;
  costCenterId?: string;
  supplierId?: string;
  customerId?: string;
  paymentMethodId?: string;
  dueDate?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();

  // SECURITY: Only ADMIN and CONTROLLER can create direct entries
  const allowedRoles = ["ADMIN", "CONTROLLER"];
  if (!allowedRoles.includes(user.memberRole)) {
    throw new Error("Permissao negada. Apenas Admin e Controller podem criar lancamentos diretos.");
  }

  // Generate next sequential number
  const lastEntry = await prisma.officialEntry.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { sequentialNumber: "desc" },
    select: { sequentialNumber: true },
  });
  const nextSeq = (lastEntry?.sequentialNumber ?? 0) + 1;

  const entry = await prisma.officialEntry.create({
    data: {
      tenantId: user.tenantId,
      sequentialNumber: nextSeq,
      date: new Date(data.date),
      competenceDate: data.competenceDate ? new Date(data.competenceDate) : new Date(data.date),
      description: data.description,
      amount: data.amount,
      type: data.transactionType,
      category: data.category,
      status: "OPEN",
      chartOfAccountId: data.chartOfAccountId,
      bankAccountId: data.bankAccountId,
      costCenterId: data.costCenterId || null,
      supplierId: data.supplierId || null,
      customerId: data.customerId || null,
      paymentMethodId: data.paymentMethodId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAmount: 0,
      movementType: data.transactionType === "CREDIT" ? "ENTRY" : "EXIT",
      financialNature: "OPERATIONAL",
      classificationStatus: "CLASSIFIED",
      incorporatedById: user.id,
      incorporatedAt: new Date(),
      version: 1,
    },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "OfficialEntry",
    recordId: entry.id,
    action: "CREATE",
    oldValues: null,
    newValues: { description: data.description, amount: data.amount, source: "DIRECT" },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/entries");
  revalidatePath("/financial/payables");
  revalidatePath("/financial/receivables");

  return entry;
}
