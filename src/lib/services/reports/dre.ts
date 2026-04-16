/**
 * DRE (Demonstração do Resultado do Exercício) Service
 *
 * Extracts the income statement calculation logic from the page component
 * into a reusable server-side service. Supports cost center filtering.
 */

import prisma from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccountRow {
  code: string;
  name: string;
  type: string;
  monthly: number[];
  ytd: number;
}

export interface DRESection {
  rows: AccountRow[];
  total: number;
  monthly: number[];
}

export interface DREResult {
  year: number;
  revenue: DRESection;
  deductions: DRESection;
  costs: DRESection;
  expenses: DRESection;
  investments: DRESection;
  // Computed subtotals
  netRevenue: number;
  netRevenueMonthly: number[];
  grossProfit: number;
  grossProfitMonthly: number[];
  operatingResult: number;
  operatingResultMonthly: number[];
  netResult: number;
  netResultMonthly: number[];
}

export interface DREFilters {
  tenantId: string;
  year: number;
  /** Optional cost center ID filter */
  costCenterId?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DRE_TYPES = ["REVENUE", "DEDUCTION", "COST", "EXPENSE", "INVESTMENT"] as const;

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Calculate the full DRE for a given tenant, year, and optional cost center.
 */
export async function calculateDRE(filters: DREFilters): Promise<DREResult> {
  const { tenantId, year, costCenterId } = filters;

  // Build where clause with optional cost center filter
  const whereClause: Record<string, unknown> = {
    tenantId,
    status: { not: "CANCELLED" },
    category: { not: "TRANSFER" },
    competenceDate: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    },
  };

  if (costCenterId) {
    whereClause.costCenterId = costCenterId;
  }

  const entries = await prisma.officialEntry.findMany({
    where: whereClause,
    include: {
      chartOfAccount: {
        select: { id: true, code: true, name: true, type: true },
      },
    },
  });

  // Group by account
  const accountMap = new Map<string, AccountRow>();

  for (const entry of entries) {
    if (!entry.chartOfAccount) continue;
    const { id, code, name, type } = entry.chartOfAccount;
    if (!DRE_TYPES.includes(type as (typeof DRE_TYPES)[number])) continue;

    if (!accountMap.has(id)) {
      accountMap.set(id, {
        code,
        name,
        type,
        monthly: Array(12).fill(0),
        ytd: 0,
      });
    }

    const row = accountMap.get(id)!;
    const month = new Date(entry.competenceDate).getMonth();
    row.monthly[month] += Number(entry.amount);
    row.ytd += Number(entry.amount);
  }

  // Build sections
  function buildSection(type: string): DRESection {
    const rows = Array.from(accountMap.values())
      .filter((r) => r.type === type)
      .sort((a, b) => a.code.localeCompare(b.code));

    const total = rows.reduce((sum, r) => sum + r.ytd, 0);
    const monthly = Array.from({ length: 12 }, (_, i) =>
      rows.reduce((sum, r) => sum + r.monthly[i], 0),
    );

    return { rows, total, monthly };
  }

  const revenue = buildSection("REVENUE");
  const deductions = buildSection("DEDUCTION");
  const costs = buildSection("COST");
  const expenses = buildSection("EXPENSE");
  const investments = buildSection("INVESTMENT");

  // Computed subtotals
  const netRevenue = revenue.total - deductions.total;
  const netRevenueMonthly = Array.from({ length: 12 }, (_, i) =>
    revenue.monthly[i] - deductions.monthly[i],
  );

  const grossProfit = netRevenue - costs.total;
  const grossProfitMonthly = Array.from({ length: 12 }, (_, i) =>
    netRevenueMonthly[i] - costs.monthly[i],
  );

  const operatingResult = grossProfit - expenses.total;
  const operatingResultMonthly = Array.from({ length: 12 }, (_, i) =>
    grossProfitMonthly[i] - expenses.monthly[i],
  );

  const netResult = operatingResult - investments.total;
  const netResultMonthly = Array.from({ length: 12 }, (_, i) =>
    operatingResultMonthly[i] - investments.monthly[i],
  );

  return {
    year,
    revenue,
    deductions,
    costs,
    expenses,
    investments,
    netRevenue,
    netRevenueMonthly,
    grossProfit,
    grossProfitMonthly,
    operatingResult,
    operatingResultMonthly,
    netResult,
    netResultMonthly,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function calcVariation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatVariation(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function variationBg(pct: number | null): string {
  if (pct === null) return "";
  if (pct >= 20) return "bg-emerald-100 text-emerald-800";
  if (pct >= 5) return "bg-emerald-50 text-emerald-700";
  if (pct > -5) return "";
  if (pct > -20) return "bg-red-50 text-red-700";
  return "bg-red-100 text-red-800";
}
