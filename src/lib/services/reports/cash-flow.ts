/**
 * Cash Flow Service
 *
 * Extracts cash flow calculation logic into a reusable server-side service.
 * Supports both realized (actual settlements) and projected (upcoming due dates).
 */

import prisma from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CashFlowDay {
  date: string; // YYYY-MM-DD
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
}

export interface CashFlowResult {
  /** Starting balance (sum of all bank accounts) */
  openingBalance: number;
  /** Realized cash movements */
  realized: CashFlowDay[];
  /** Projected cash movements (from open entries) */
  projected: CashFlowDay[];
  /** Summary totals */
  totalRealized: { inflow: number; outflow: number; net: number };
  totalProjected: { inflow: number; outflow: number; net: number };
}

export interface CashFlowFilters {
  tenantId: string;
  /** Start of realized period */
  startDate: Date;
  /** End of realized period */
  endDate: Date;
  /** How far to project future cash flows (days from endDate) */
  projectionDays?: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Calculate realized + projected cash flow for a given period.
 */
export async function calculateCashFlow(
  filters: CashFlowFilters,
): Promise<CashFlowResult> {
  const { tenantId, startDate, endDate, projectionDays = 60 } = filters;

  // 1. Get opening balance from bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { tenantId, active: true, deletedAt: null },
    select: { currentBalance: true },
  });

  const openingBalance = bankAccounts.reduce(
    (sum, acc) => sum + Number(acc.currentBalance),
    0,
  );

  // 2. Get realized settlements within the period
  const settlements = await prisma.settlement.findMany({
    where: {
      tenantId,
      settlementDate: { gte: startDate, lte: endDate },
    },
    include: {
      officialEntry: {
        select: { category: true, type: true },
      },
    },
    orderBy: { settlementDate: "asc" },
  });

  // Group realized by day
  const realizedMap = new Map<string, { inflow: number; outflow: number }>();

  for (const s of settlements) {
    if (!s.settlementDate) continue;
    const dateKey = s.settlementDate.toISOString().slice(0, 10);
    if (!realizedMap.has(dateKey)) {
      realizedMap.set(dateKey, { inflow: 0, outflow: 0 });
    }
    const day = realizedMap.get(dateKey)!;
    const amount = Number(s.amount) + Number(s.interestAmount) + Number(s.fineAmount) - Number(s.discountAmount);

    if (s.officialEntry.category === "RECEIVABLE") {
      day.inflow += amount;
    } else if (s.officialEntry.category === "PAYABLE") {
      day.outflow += amount;
    }
  }

  // Build realized array
  let runningBalance = openingBalance;
  const realized: CashFlowDay[] = [];

  const sortedDates = Array.from(realizedMap.keys()).sort();
  for (const date of sortedDates) {
    const { inflow, outflow } = realizedMap.get(date)!;
    const net = inflow - outflow;
    runningBalance += net;
    realized.push({ date, inflow, outflow, net, runningBalance });
  }

  // 3. Get projected from open entries with due dates
  const futureDate = new Date(endDate);
  futureDate.setDate(futureDate.getDate() + projectionDays);

  const openEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "PARTIAL", "OVERDUE"] },
      dueDate: { gte: endDate, lte: futureDate },
    },
    select: {
      amount: true,
      paidAmount: true,
      category: true,
      dueDate: true,
    },
    orderBy: { dueDate: "asc" },
  });

  // Group projected by day
  const projectedMap = new Map<string, { inflow: number; outflow: number }>();

  for (const entry of openEntries) {
    if (!entry.dueDate) continue;
    const dateKey = entry.dueDate.toISOString().slice(0, 10);
    if (!projectedMap.has(dateKey)) {
      projectedMap.set(dateKey, { inflow: 0, outflow: 0 });
    }
    const day = projectedMap.get(dateKey)!;
    const remaining = Number(entry.amount) - Number(entry.paidAmount ?? 0);

    if (entry.category === "RECEIVABLE") {
      day.inflow += remaining;
    } else if (entry.category === "PAYABLE") {
      day.outflow += remaining;
    }
  }

  // Build projected array
  let projectedBalance = runningBalance;
  const projected: CashFlowDay[] = [];

  const sortedProjectedDates = Array.from(projectedMap.keys()).sort();
  for (const date of sortedProjectedDates) {
    const { inflow, outflow } = projectedMap.get(date)!;
    const net = inflow - outflow;
    projectedBalance += net;
    projected.push({ date, inflow, outflow, net, runningBalance: projectedBalance });
  }

  // 4. Summary
  const totalRealized = {
    inflow: realized.reduce((sum, d) => sum + d.inflow, 0),
    outflow: realized.reduce((sum, d) => sum + d.outflow, 0),
    net: realized.reduce((sum, d) => sum + d.net, 0),
  };

  const totalProjected = {
    inflow: projected.reduce((sum, d) => sum + d.inflow, 0),
    outflow: projected.reduce((sum, d) => sum + d.outflow, 0),
    net: projected.reduce((sum, d) => sum + d.net, 0),
  };

  return {
    openingBalance,
    realized,
    projected,
    totalRealized,
    totalProjected,
  };
}
