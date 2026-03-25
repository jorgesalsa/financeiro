import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";

interface MatchCandidate {
  bankStatementLineId: string;
  officialEntryId?: string;
  settlementId?: string;
  matchType: "AUTO_EXACT" | "AUTO_DATE_TOLERANCE" | "AUTO_VALUE_TOLERANCE" | "MANUAL";
  score: number;
}

export async function autoReconcile(tenantId: string, bankAccountId: string, userId: string, userEmail: string) {
  // Get unreconciled bank statement lines
  const unreconciledLines = await prisma.bankStatementLine.findMany({
    where: {
      tenantId,
      bankAccountId,
      reconciliation: null,
    },
    orderBy: { transactionDate: "asc" },
  });

  // Get unreconciled settlements for this bank account
  const unreconciledSettlements = await prisma.settlement.findMany({
    where: {
      tenantId,
      bankAccountId,
      reconciliation: null,
    },
    include: { officialEntry: true },
  });

  const matches: MatchCandidate[] = [];
  const matchedLineIds = new Set<string>();
  const matchedSettlementIds = new Set<string>();

  // Pass 1: Exact match (same date, same amount)
  for (const line of unreconciledLines) {
    if (matchedLineIds.has(line.id)) continue;

    for (const settlement of unreconciledSettlements) {
      if (matchedSettlementIds.has(settlement.id)) continue;

      const lineDate = new Date(line.transactionDate).toDateString();
      const settDate = new Date(settlement.date).toDateString();
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);

      if (lineDate === settDate && Math.abs(lineAmt - settAmt) < 0.01) {
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_EXACT",
          score: 100,
        });
        matchedLineIds.add(line.id);
        matchedSettlementIds.add(settlement.id);
        break;
      }
    }
  }

  // Pass 2: Date tolerance (+/-2 days, same amount)
  for (const line of unreconciledLines) {
    if (matchedLineIds.has(line.id)) continue;

    for (const settlement of unreconciledSettlements) {
      if (matchedSettlementIds.has(settlement.id)) continue;

      const lineDateMs = new Date(line.transactionDate).getTime();
      const settDateMs = new Date(settlement.date).getTime();
      const daysDiff = Math.abs(lineDateMs - settDateMs) / (1000 * 60 * 60 * 24);
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);

      if (daysDiff <= 2 && Math.abs(lineAmt - settAmt) < 0.01) {
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_DATE_TOLERANCE",
          score: 80,
        });
        matchedLineIds.add(line.id);
        matchedSettlementIds.add(settlement.id);
        break;
      }
    }
  }

  // Pass 3: Value tolerance (same date, +/-1% value)
  for (const line of unreconciledLines) {
    if (matchedLineIds.has(line.id)) continue;

    for (const settlement of unreconciledSettlements) {
      if (matchedSettlementIds.has(settlement.id)) continue;

      const lineDate = new Date(line.transactionDate).toDateString();
      const settDate = new Date(settlement.date).toDateString();
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);
      const tolerance = settAmt * 0.01;

      if (lineDate === settDate && Math.abs(lineAmt - settAmt) <= tolerance) {
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_VALUE_TOLERANCE",
          score: 60,
        });
        matchedLineIds.add(line.id);
        matchedSettlementIds.add(settlement.id);
        break;
      }
    }
  }

  // Create reconciliation records
  let reconciled = 0;
  for (const match of matches) {
    await prisma.reconciliation.create({
      data: {
        tenantId,
        bankStatementLineId: match.bankStatementLineId,
        officialEntryId: match.officialEntryId ?? null,
        settlementId: match.settlementId ?? null,
        matchType: match.matchType,
        reconciledById: userId,
        reconciledAt: new Date(),
      },
    });
    reconciled++;
  }

  if (reconciled > 0) {
    await createAuditLog({
      tenantId,
      tableName: "Reconciliation",
      recordId: `batch-${bankAccountId}`,
      action: "CREATE",
      newValues: { reconciled, auto: true },
      userId,
      userEmail,
    });
  }

  return {
    total: unreconciledLines.length,
    reconciled,
    remaining: unreconciledLines.length - reconciled,
  };
}

export async function manualReconcile(
  tenantId: string,
  bankStatementLineId: string,
  officialEntryId: string | null,
  settlementId: string | null,
  userId: string,
  userEmail: string
) {
  const reconciliation = await prisma.reconciliation.create({
    data: {
      tenantId,
      bankStatementLineId,
      officialEntryId,
      settlementId,
      matchType: "MANUAL",
      reconciledById: userId,
      reconciledAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    tableName: "Reconciliation",
    recordId: reconciliation.id,
    action: "CREATE",
    newValues: { matchType: "MANUAL", bankStatementLineId },
    userId,
    userEmail,
  });

  return reconciliation;
}
