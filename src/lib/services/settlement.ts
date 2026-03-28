import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";

export async function settleEntry(params: {
  tenantId: string;
  officialEntryId: string;
  date: Date;
  // RA01: Settlement date (may differ from accounting date)
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
        // RA01: Use settlementDate if provided, fallback to date
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

    // Update bank balance
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
