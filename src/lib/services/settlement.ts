import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";

/**
 * Validates that a foreign-key resource belongs to the same tenant.
 * Prevents cross-tenant data access.
 */
async function assertTenantOwnership(
  tenantId: string,
  checks: { bankAccountId?: string; paymentMethodId?: string | null }
) {
  if (checks.bankAccountId) {
    const bank = await prisma.bankAccount.findFirst({
      where: { id: checks.bankAccountId, tenantId },
      select: { id: true },
    });
    if (!bank) throw new Error("Conta bancária não pertence a este tenant");
  }
  if (checks.paymentMethodId) {
    const pm = await prisma.paymentMethod.findFirst({
      where: { id: checks.paymentMethodId, tenantId },
      select: { id: true },
    });
    if (!pm) throw new Error("Forma de pagamento não pertence a este tenant");
  }
}

/**
 * Checks if the period (year/month) is locked for this tenant.
 * Prevents settlements in closed accounting periods.
 */
async function assertPeriodNotLocked(tenantId: string, date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lock = await prisma.periodLock.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });
  if (lock) {
    throw new Error(`Período ${month.toString().padStart(2, "0")}/${year} está fechado`);
  }
}

export async function settleEntry(params: {
  tenantId: string;
  officialEntryId: string;
  date: Date;
  settlementDate?: Date | null;
  amount: number;
  interestAmount?: number;
  fineAmount?: number;
  discountAmount?: number;
  bankAccountId: string;
  paymentMethodId?: string | null;
  document?: string | null;
  notes?: string | null;
  userId: string;
  userEmail: string;
}) {
  // SECURITY: Validate tenant ownership of bankAccount and paymentMethod
  await assertTenantOwnership(params.tenantId, {
    bankAccountId: params.bankAccountId,
    paymentMethodId: params.paymentMethodId,
  });

  // SECURITY: Check period lock
  const effectiveDate = params.settlementDate ?? params.date;
  await assertPeriodNotLocked(params.tenantId, effectiveDate);

  const entry = await prisma.officialEntry.findFirstOrThrow({
    where: { id: params.officialEntryId, tenantId: params.tenantId, status: { in: ["OPEN", "PARTIAL"] } },
    include: { settlements: true },
  });

  const previouslyPaid = entry.settlements.reduce((sum, s) => sum + Number(s.amount), 0);
  const remaining = Number(entry.amount) - previouslyPaid;
  const paymentAmount = params.amount + (params.interestAmount ?? 0) + (params.fineAmount ?? 0) - (params.discountAmount ?? 0);

  if (params.amount > remaining + 0.01) {
    throw new Error(`Valor excede o saldo devedor de R$ ${remaining.toFixed(2)}`);
  }

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.settlement.create({
      data: {
        tenantId: params.tenantId,
        officialEntryId: params.officialEntryId,
        date: params.date,
        settlementDate: params.settlementDate ?? params.date,
        amount: params.amount,
        interestAmount: params.interestAmount ?? 0,
        fineAmount: params.fineAmount ?? 0,
        discountAmount: params.discountAmount ?? 0,
        bankAccountId: params.bankAccountId,
        paymentMethodId: params.paymentMethodId ?? null,
        document: params.document ?? null,
        notes: params.notes ?? null,
        settledById: params.userId,
      },
    });

    const totalPaid = previouslyPaid + params.amount;
    const isFullyPaid = totalPaid >= Number(entry.amount) - 0.01;

    await tx.officialEntry.update({
      where: { id: params.officialEntryId },
      data: {
        status: isFullyPaid ? "SETTLED" : "PARTIAL",
        paidDate: isFullyPaid ? params.date : null,
        paidAmount: totalPaid,
        interestAmount: Number(entry.interestAmount) + (params.interestAmount ?? 0),
        fineAmount: Number(entry.fineAmount) + (params.fineAmount ?? 0),
        discountAmount: Number(entry.discountAmount) + (params.discountAmount ?? 0),
      },
    });

    // Update bank balance — tenant-validated bankAccountId
    const balanceChange = entry.category === "PAYABLE"
      ? -paymentAmount
      : paymentAmount;

    await tx.bankAccount.update({
      where: { id: params.bankAccountId },
      data: { currentBalance: { increment: balanceChange } },
    });

    return created;
  });

  await createAuditLog({
    tenantId: params.tenantId,
    tableName: "Settlement",
    recordId: settlement.id,
    action: "CREATE",
    newValues: { amount: params.amount, officialEntryId: params.officialEntryId },
    userId: params.userId,
    userEmail: params.userEmail,
  });

  return settlement;
}
