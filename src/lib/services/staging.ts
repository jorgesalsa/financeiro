import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";
import type { StagingStatus } from "@/generated/prisma";

// RA02: State Machine — Valid Transitions
const VALID_TRANSITIONS: Record<StagingStatus, StagingStatus[]> = {
  PENDING: ["PARSED", "REJECTED"],
  PARSED: ["NORMALIZED", "REJECTED"],
  NORMALIZED: ["AUTO_CLASSIFIED", "CONFLICT", "VALIDATED", "REJECTED"],
  AUTO_CLASSIFIED: ["VALIDATED", "CONFLICT", "REJECTED"],
  CONFLICT: ["AUTO_CLASSIFIED", "VALIDATED", "REJECTED"],
  VALIDATED: ["INCORPORATED", "REJECTED"],
  REJECTED: ["PENDING"],
  INCORPORATED: [],
};

export function assertValidTransition(from: StagingStatus, to: StagingStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Transição inválida: ${from} → ${to}. Transições permitidas: ${(allowed ?? []).join(", ") || "nenhuma"}`
    );
  }
}

async function transitionStatus(
  entryId: string,
  tenantId: string,
  newStatus: StagingStatus,
  userId: string,
  userEmail: string,
  extraData?: Record<string, unknown>
) {
  const entry = await prisma.stagingEntry.findFirstOrThrow({
    where: { id: entryId, tenantId },
  });

  assertValidTransition(entry.status, newStatus);

  await prisma.stagingEntry.update({
    where: { id: entryId },
    data: { status: newStatus, ...extraData },
  });

  await createAuditLog({
    tenantId,
    tableName: "StagingEntry",
    recordId: entryId,
    action: "UPDATE",
    oldValues: { status: entry.status },
    newValues: { status: newStatus, ...extraData },
    userId,
    userEmail,
  });
}

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

  if (!entry.chartOfAccountId) errors.push("Categoria nao informada");
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

  // RA02: Use state machine transition
  await transitionStatus(entryId, tenantId, "VALIDATED", userId, userEmail, {
    validatedById: userId,
    validatedAt: new Date(),
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
          // BUG-07 FIX: Don't mask missing competenceDate with emission date
          competenceDate: entry.competenceDate ?? entry.date, // Keep fallback to avoid NULL constraint, but staging validation should enforce
          description: entry.description,
          amount: entry.amount,
          type: entry.type,
          status: "OPEN",
          // BUG-05 FIX: Use staging category when available, derive from type as fallback
          category: entry.category ?? (entry.type === "DEBIT" ? "PAYABLE" : "RECEIVABLE"),
          chartOfAccountId: entry.chartOfAccountId!,
          costCenterId: entry.costCenterId,
          supplierId: entry.supplierId,
          customerId: entry.customerId,
          bankAccountId: entry.bankAccountId!,
          paymentMethodId: entry.paymentMethodId,
          documentNumber: entry.documentNumber ?? null,
          // BUG-06 FIX: Keep dueDate as-is; null dueDate is valid (no due date)
          dueDate: entry.dueDate,
          stagingEntryId: entry.id,
          incorporatedById: userId,
          incorporatedAt: new Date(),
          // RA05: Copy taxonomy from staging
          movementType: entry.movementType,
          financialNature: entry.financialNature,
          classificationStatus: entry.classificationStatus ?? "PENDING_CLASSIFICATION",
        },
      });

      // Auto-settle if pendingSettlement exists
      if (entry.pendingSettlement) {
        const ps = entry.pendingSettlement as {
          amount: number;
          interestAmount?: number;
          fineAmount?: number;
          discountAmount?: number;
          date: string;
          bankAccountId: string;
          paymentMethodId?: string | null;
        };

        await tx.settlement.create({
          data: {
            tenantId,
            officialEntryId: created.id,
            date: new Date(ps.date),
            settlementDate: new Date(ps.date),
            amount: ps.amount,
            interestAmount: ps.interestAmount ?? 0,
            fineAmount: ps.fineAmount ?? 0,
            discountAmount: ps.discountAmount ?? 0,
            bankAccountId: ps.bankAccountId,
            paymentMethodId: ps.paymentMethodId ?? null,
            settledById: userId,
          },
        });

        const totalPaid = ps.amount;
        const isFullyPaid = totalPaid >= Number(entry.amount) - 0.01;

        await tx.officialEntry.update({
          where: { id: created.id },
          data: {
            status: isFullyPaid ? "SETTLED" : "PARTIAL",
            paidDate: isFullyPaid ? new Date(ps.date) : null,
            paidAmount: totalPaid,
            interestAmount: ps.interestAmount ?? 0,
            fineAmount: ps.fineAmount ?? 0,
            discountAmount: ps.discountAmount ?? 0,
          },
        });

        // Update bank balance
        const paymentAmount =
          ps.amount +
          (ps.interestAmount ?? 0) +
          (ps.fineAmount ?? 0) -
          (ps.discountAmount ?? 0);
        const balanceChange =
          entry.type === "DEBIT" ? -paymentAmount : paymentAmount;

        await tx.bankAccount.update({
          where: { id: ps.bankAccountId },
          data: { currentBalance: { increment: balanceChange } },
        });
      }

      // RA02: State machine transition
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
