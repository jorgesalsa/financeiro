import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";

// RA06: Create an internal transfer between two bank accounts
export async function createInternalTransfer(params: {
  tenantId: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  transferDate: Date;
  reference?: string | null;
  userId: string;
  userEmail: string;
}) {
  if (params.sourceAccountId === params.targetAccountId) {
    throw new Error("Conta de origem e destino devem ser diferentes");
  }

  // Verify both accounts belong to tenant
  const [source, target] = await Promise.all([
    prisma.bankAccount.findFirstOrThrow({
      where: { id: params.sourceAccountId, tenantId: params.tenantId },
    }),
    prisma.bankAccount.findFirstOrThrow({
      where: { id: params.targetAccountId, tenantId: params.tenantId },
    }),
  ]);

  // Get next sequential numbers
  const lastEntry = await prisma.officialEntry.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { sequentialNumber: "desc" },
    select: { sequentialNumber: true },
  });
  const nextSeq = (lastEntry?.sequentialNumber ?? 0) + 1;

  const description = params.reference
    ? `Transferência interna: ${source.bankName} → ${target.bankName} (${params.reference})`
    : `Transferência interna: ${source.bankName} → ${target.bankName}`;

  // Need a chart of account for TRANSFER entries — get any active one
  const transferAccount = await prisma.chartOfAccount.findFirst({
    where: { tenantId: params.tenantId, active: true, type: "ASSET" },
    orderBy: { code: "asc" },
  });
  if (!transferAccount) {
    throw new Error("Nenhuma conta contábil ativa do tipo ATIVO encontrada");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create DEBIT entry (outgoing from source)
    const debitEntry = await tx.officialEntry.create({
      data: {
        tenantId: params.tenantId,
        sequentialNumber: nextSeq,
        date: params.transferDate,
        competenceDate: params.transferDate,
        description,
        amount: params.amount,
        type: "DEBIT",
        status: "SETTLED",
        category: "TRANSFER",
        chartOfAccountId: transferAccount.id,
        bankAccountId: params.sourceAccountId,
        paidDate: params.transferDate,
        paidAmount: params.amount,
        incorporatedById: params.userId,
        incorporatedAt: new Date(),
        movementType: "TRANSFER",
        financialNature: "FINANCIAL",
        classificationStatus: "CLASSIFIED",
      },
    });

    // Create CREDIT entry (incoming to target)
    const creditEntry = await tx.officialEntry.create({
      data: {
        tenantId: params.tenantId,
        sequentialNumber: nextSeq + 1,
        date: params.transferDate,
        competenceDate: params.transferDate,
        description,
        amount: params.amount,
        type: "CREDIT",
        status: "SETTLED",
        category: "TRANSFER",
        chartOfAccountId: transferAccount.id,
        bankAccountId: params.targetAccountId,
        paidDate: params.transferDate,
        paidAmount: params.amount,
        incorporatedById: params.userId,
        incorporatedAt: new Date(),
        movementType: "TRANSFER",
        financialNature: "FINANCIAL",
        classificationStatus: "CLASSIFIED",
      },
    });

    // Create the InternalTransfer record
    const transfer = await tx.internalTransfer.create({
      data: {
        tenantId: params.tenantId,
        sourceAccountId: params.sourceAccountId,
        targetAccountId: params.targetAccountId,
        amount: params.amount,
        transferDate: params.transferDate,
        reference: params.reference ?? null,
        debitEntryId: debitEntry.id,
        creditEntryId: creditEntry.id,
        createdById: params.userId,
      },
    });

    // Update bank balances
    await tx.bankAccount.update({
      where: { id: params.sourceAccountId },
      data: { currentBalance: { decrement: params.amount } },
    });
    await tx.bankAccount.update({
      where: { id: params.targetAccountId },
      data: { currentBalance: { increment: params.amount } },
    });

    return { transfer, debitEntry, creditEntry };
  });

  await createAuditLog({
    tenantId: params.tenantId,
    tableName: "InternalTransfer",
    recordId: result.transfer.id,
    action: "CREATE",
    newValues: {
      amount: params.amount,
      source: source.bankName,
      target: target.bankName,
    },
    userId: params.userId,
    userEmail: params.userEmail,
  });

  return result;
}
