import prisma from "@/lib/db";
import { addDays } from "date-fns";
import { createAuditLog } from "@/lib/utils/audit";

export async function generateInstallments(params: {
  tenantId: string;
  officialEntryId: string;
  numberOfInstallments: number;
  firstDueDate: Date;
  intervalDays: number;
  userId: string;
  userEmail: string;
}) {
  const original = await prisma.officialEntry.findFirstOrThrow({
    where: { id: params.officialEntryId, tenantId: params.tenantId, status: "OPEN" },
  });

  const totalAmount = Number(original.amount);
  const installmentAmount = Math.floor((totalAmount / params.numberOfInstallments) * 100) / 100;
  const lastInstallmentAmount = totalAmount - installmentAmount * (params.numberOfInstallments - 1);

  const groupId = `INST-${original.id.substring(0, 8)}`;

  // Get next sequential number
  const lastEntry = await prisma.officialEntry.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { sequentialNumber: "desc" },
    select: { sequentialNumber: true },
  });
  let nextSeq = (lastEntry?.sequentialNumber ?? 0) + 1;

  const installments = await prisma.$transaction(async (tx) => {
    // Cancel original entry
    await tx.officialEntry.update({
      where: { id: params.officialEntryId },
      data: { status: "CANCELLED" },
    });

    const created = [];
    for (let i = 0; i < params.numberOfInstallments; i++) {
      const dueDate = addDays(params.firstDueDate, i * params.intervalDays);
      const amount = i === params.numberOfInstallments - 1 ? lastInstallmentAmount : installmentAmount;

      const entry = await tx.officialEntry.create({
        data: {
          tenantId: params.tenantId,
          sequentialNumber: nextSeq + i,
          date: original.date,
          competenceDate: original.competenceDate,
          description: `${original.description} (${i + 1}/${params.numberOfInstallments})`,
          amount,
          type: original.type,
          status: "OPEN",
          category: original.category,
          chartOfAccountId: original.chartOfAccountId,
          costCenterId: original.costCenterId,
          supplierId: original.supplierId,
          customerId: original.customerId,
          bankAccountId: original.bankAccountId,
          paymentMethodId: original.paymentMethodId,
          documentNumber: original.documentNumber,
          dueDate,
          originalDueDate: dueDate,
          installmentGroupId: groupId,
          installmentNumber: i + 1,
          totalInstallments: params.numberOfInstallments,
          incorporatedById: params.userId,
          incorporatedAt: new Date(),
        },
      });
      created.push(entry);
    }
    return created;
  });

  await createAuditLog({
    tenantId: params.tenantId,
    tableName: "OfficialEntry",
    recordId: groupId,
    action: "CREATE",
    newValues: { installments: params.numberOfInstallments, originalEntryId: params.officialEntryId },
    userId: params.userId,
    userEmail: params.userEmail,
  });

  return installments;
}
