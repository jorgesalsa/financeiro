import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";

export async function validateStagingEntry(
  entryId: string,
  tenantId: string,
  userId: string,
  userEmail: string
) {
  const entry = await prisma.stagingEntry.findFirstOrThrow({
    where: { id: entryId, tenantId },
  });

  const errors: string[] = [];

  if (!entry.chartOfAccountId) errors.push("Conta contabil nao informada");
  if (!entry.bankAccountId) errors.push("Conta bancaria nao informada");
  if (!entry.date) errors.push("Data nao informada");
  if (!entry.description) errors.push("Descricao nao informada");
  if (Number(entry.amount) <= 0) errors.push("Valor deve ser positivo");

  // Check for duplicates
  const duplicate = await prisma.stagingEntry.findFirst({
    where: {
      tenantId,
      id: { not: entryId },
      date: entry.date,
      amount: entry.amount,
      description: entry.description,
      status: { not: "REJECTED" },
    },
  });
  if (duplicate) errors.push("Possivel duplicidade detectada");

  // Check period lock
  const entryDate = new Date(entry.date);
  const lock = await prisma.periodLock.findUnique({
    where: {
      tenantId_year_month: {
        tenantId,
        year: entryDate.getFullYear(),
        month: entryDate.getMonth() + 1,
      },
    },
  });
  if (lock) errors.push(`Periodo ${entryDate.getMonth() + 1}/${entryDate.getFullYear()} esta bloqueado`);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  await prisma.stagingEntry.update({
    where: { id: entryId },
    data: { status: "VALIDATED", validatedById: userId, validatedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    tableName: "StagingEntry",
    recordId: entryId,
    action: "UPDATE",
    oldValues: { status: entry.status },
    newValues: { status: "VALIDATED" },
    userId,
    userEmail,
  });

  return { valid: true, errors: [] };
}

export async function incorporateStagingEntries(
  entryIds: string[],
  tenantId: string,
  userId: string,
  userEmail: string
) {
  const entries = await prisma.stagingEntry.findMany({
    where: { id: { in: entryIds }, tenantId, status: "VALIDATED" },
  });

  if (entries.length === 0) throw new Error("Nenhum lancamento validado selecionado");

  // Get next sequential number
  const lastEntry = await prisma.officialEntry.findFirst({
    where: { tenantId },
    orderBy: { sequentialNumber: "desc" },
    select: { sequentialNumber: true },
  });
  let nextSeq = (lastEntry?.sequentialNumber ?? 0) + 1;

  const results: { id: string; sequentialNumber: number }[] = [];

  for (const entry of entries) {
    const official = await prisma.$transaction(async (tx) => {
      const created = await tx.officialEntry.create({
        data: {
          tenantId,
          sequentialNumber: nextSeq,
          date: entry.date,
          competenceDate: entry.date,
          description: entry.description,
          amount: entry.amount,
          type: entry.type,
          status: "OPEN",
          category: entry.type === "DEBIT" ? "PAYABLE" : "RECEIVABLE",
          chartOfAccountId: entry.chartOfAccountId!,
          costCenterId: entry.costCenterId,
          supplierId: entry.supplierId,
          customerId: entry.customerId,
          bankAccountId: entry.bankAccountId!,
          paymentMethodId: entry.paymentMethodId,
          documentNumber: null,
          dueDate: entry.date,
          stagingEntryId: entry.id,
          incorporatedById: userId,
          incorporatedAt: new Date(),
        },
      });

      await tx.stagingEntry.update({
        where: { id: entry.id },
        data: { status: "INCORPORATED" },
      });

      return created;
    });

    results.push({ id: official.id, sequentialNumber: nextSeq });
    nextSeq++;
  }

  await createAuditLog({
    tenantId,
    tableName: "OfficialEntry",
    recordId: results.map((r) => r.id).join(","),
    action: "CREATE",
    newValues: { incorporated: results.length, from: "staging" },
    userId,
    userEmail,
  });

  return results;
}
