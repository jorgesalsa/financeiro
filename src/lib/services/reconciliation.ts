import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";
import type { MatchBasis } from "@/generated/prisma";

interface MatchCandidate {
  bankStatementLineId: string;
  officialEntryId?: string;
  settlementId?: string;
  matchType: "AUTO_EXACT" | "AUTO_DATE_TOLERANCE" | "AUTO_VALUE_TOLERANCE" | "MANUAL";
  // RA04: Confidence scoring
  matchConfidence: number;
  matchBasis: MatchBasis;
  requiresHumanReview: boolean;
  reviewReason?: string;
}

// RA04: Confidence thresholds
const HUMAN_REVIEW_THRESHOLD = 70;

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

      // RA01: Use bankPostedDate when available, fallback to transactionDate
      const lineDate = new Date(line.bankPostedDate ?? line.transactionDate).toDateString();
      const settDate = new Date(settlement.settlementDate ?? settlement.date).toDateString();
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);

      if (lineDate === settDate && Math.abs(lineAmt - settAmt) < 0.01) {
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_EXACT",
          matchConfidence: 100,
          matchBasis: "AMOUNT_DATE",
          requiresHumanReview: false,
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

      const lineDateMs = new Date(line.bankPostedDate ?? line.transactionDate).getTime();
      const settDateMs = new Date(settlement.settlementDate ?? settlement.date).getTime();
      const daysDiff = Math.abs(lineDateMs - settDateMs) / (1000 * 60 * 60 * 24);
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);

      if (daysDiff <= 2 && Math.abs(lineAmt - settAmt) < 0.01) {
        const confidence = daysDiff <= 1 ? 85 : 75;
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_DATE_TOLERANCE",
          matchConfidence: confidence,
          matchBasis: "AMOUNT_DATE",
          requiresHumanReview: confidence < HUMAN_REVIEW_THRESHOLD,
          reviewReason: confidence < HUMAN_REVIEW_THRESHOLD ? `Diferença de ${daysDiff.toFixed(0)} dias` : undefined,
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

      const lineDate = new Date(line.bankPostedDate ?? line.transactionDate).toDateString();
      const settDate = new Date(settlement.settlementDate ?? settlement.date).toDateString();
      const lineAmt = Math.abs(Number(line.amount));
      const settAmt = Number(settlement.amount);
      const tolerance = settAmt * 0.01;
      const valueDiff = Math.abs(lineAmt - settAmt);

      if (lineDate === settDate && valueDiff <= tolerance) {
        const confidence = valueDiff < tolerance * 0.5 ? 65 : 55;
        matches.push({
          bankStatementLineId: line.id,
          settlementId: settlement.id,
          officialEntryId: settlement.officialEntryId,
          matchType: "AUTO_VALUE_TOLERANCE",
          matchConfidence: confidence,
          matchBasis: "AMOUNT_ONLY",
          requiresHumanReview: true,
          reviewReason: `Diferença de valor: R$ ${valueDiff.toFixed(2)}`,
        });
        matchedLineIds.add(line.id);
        matchedSettlementIds.add(settlement.id);
        break;
      }
    }
  }

  // Create reconciliation records
  let reconciled = 0;
  let pendingReview = 0;
  for (const match of matches) {
    await prisma.reconciliation.create({
      data: {
        tenantId,
        bankStatementLineId: match.bankStatementLineId,
        officialEntryId: match.officialEntryId ?? null,
        settlementId: match.settlementId ?? null,
        matchType: match.matchType,
        // RA04: Confidence scoring fields
        matchConfidence: match.matchConfidence,
        matchBasis: match.matchBasis,
        requiresHumanReview: match.requiresHumanReview,
        reviewReason: match.reviewReason ?? null,
        reconciledById: userId,
        reconciledAt: new Date(),
      },
    });
    reconciled++;
    if (match.requiresHumanReview) pendingReview++;
  }

  if (reconciled > 0) {
    await createAuditLog({
      tenantId,
      tableName: "Reconciliation",
      recordId: `batch-${bankAccountId}`,
      action: "CREATE",
      newValues: { reconciled, pendingReview, auto: true },
      userId,
      userEmail,
    });
  }

  return {
    total: unreconciledLines.length,
    reconciled,
    pendingReview,
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
      matchConfidence: 100,
      matchBasis: "MANUAL",
      requiresHumanReview: false,
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

// RA04: Approve a reconciliation that requires human review
export async function approveReconciliation(
  reconciliationId: string,
  tenantId: string,
  userId: string,
  userEmail: string
) {
  const rec = await prisma.reconciliation.findFirstOrThrow({
    where: { id: reconciliationId, tenantId, requiresHumanReview: true },
  });

  await prisma.reconciliation.update({
    where: { id: reconciliationId },
    data: {
      requiresHumanReview: false,
      approvedById: userId,
      approvedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    tableName: "Reconciliation",
    recordId: reconciliationId,
    action: "UPDATE",
    oldValues: { requiresHumanReview: true },
    newValues: { requiresHumanReview: false, approvedById: userId },
    userId,
    userEmail,
  });
}
