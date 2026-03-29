"use server";

import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import type { RevenueExpenseDataPoint } from "@/components/dashboard/revenue-expense-chart";
import type { CashFlowDataPoint } from "@/components/dashboard/cash-flow-chart";
import type { ExpenseBreakdownDataPoint } from "@/components/dashboard/expense-breakdown-chart";
import type { AgingDataPoint } from "@/components/dashboard/aging-chart";

export interface DashboardKpis {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  contasVencidas: number;
  receitasTrend: number | null;
  despesasTrend: number | null;
}

export interface DashboardData {
  kpis: DashboardKpis;
  revenueExpense: RevenueExpenseDataPoint[];
  cashFlow: CashFlowDataPoint[];
  expenseBreakdown: ExpenseBreakdownDataPoint[];
  aging: AgingDataPoint[];
}

const MONTH_NAMES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_PT[month]}/${year}`;
}

function getMonthRange(monthsBack: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return null;

  const tenantId = user.tenantId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const { start: sixMonthsAgo } = getMonthRange(5);

  // --- KPIs ---
  const [
    currentReceivable,
    currentPayable,
    prevReceivable,
    prevPayable,
    overdueCount,
  ] = await Promise.all([
    // BUG-03 FIX: Filter by status != CANCELLED for competence-based KPIs
    // Current month receivable (revenue)
    prisma.officialEntry.aggregate({
      where: {
        tenantId,
        category: "RECEIVABLE",
        status: { not: "CANCELLED" },
        competenceDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    // Current month payable (expense)
    prisma.officialEntry.aggregate({
      where: {
        tenantId,
        category: "PAYABLE",
        status: { not: "CANCELLED" },
        competenceDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    // Previous month receivable
    prisma.officialEntry.aggregate({
      where: {
        tenantId,
        category: "RECEIVABLE",
        status: { not: "CANCELLED" },
        competenceDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      _sum: { amount: true },
    }),
    // Previous month payable
    prisma.officialEntry.aggregate({
      where: {
        tenantId,
        category: "PAYABLE",
        status: { not: "CANCELLED" },
        competenceDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      _sum: { amount: true },
    }),
    // Overdue count
    prisma.officialEntry.count({
      where: {
        tenantId,
        status: { in: ["OPEN", "PARTIAL"] },
        dueDate: { lt: now },
      },
    }),
  ]);

  const totalReceitas = Number(currentReceivable._sum.amount ?? 0);
  const totalDespesas = Number(currentPayable._sum.amount ?? 0);
  const prevReceitas = Number(prevReceivable._sum.amount ?? 0);
  const prevDespesas = Number(prevPayable._sum.amount ?? 0);

  const receitasTrend =
    prevReceitas > 0
      ? ((totalReceitas - prevReceitas) / prevReceitas) * 100
      : null;
  const despesasTrend =
    prevDespesas > 0
      ? ((totalDespesas - prevDespesas) / prevDespesas) * 100
      : null;

  // --- Revenue vs Expense (last 6 months) ---
  // BUG-03 FIX: Exclude cancelled entries from charts
  const monthlyEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId,
      competenceDate: { gte: sixMonthsAgo, lte: endOfMonth },
      category: { in: ["RECEIVABLE", "PAYABLE"] },
      status: { not: "CANCELLED" },
    },
    select: {
      competenceDate: true,
      amount: true,
      category: true,
    },
  });

  const monthlyMap = new Map<
    string,
    { receitas: number; despesas: number }
  >();

  // Pre-fill 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthLabel(d.getFullYear(), d.getMonth());
    monthlyMap.set(key, { receitas: 0, despesas: 0 });
  }

  for (const entry of monthlyEntries) {
    const d = new Date(entry.competenceDate);
    const key = getMonthLabel(d.getFullYear(), d.getMonth());
    const existing = monthlyMap.get(key);
    if (existing) {
      const amt = Number(entry.amount);
      if (entry.category === "RECEIVABLE") {
        existing.receitas += amt;
      } else {
        existing.despesas += amt;
      }
    }
  }

  const revenueExpense: RevenueExpenseDataPoint[] = Array.from(
    monthlyMap.entries()
  ).map(([month, values]) => ({
    month,
    receitas: Math.round(values.receitas * 100) / 100,
    despesas: Math.round(values.despesas * 100) / 100,
  }));

  // --- Cash Flow (last 6 months cumulative) ---
  let cumulativeSaldo = 0;
  const cashFlow: CashFlowDataPoint[] = revenueExpense.map((item) => {
    cumulativeSaldo += item.receitas - item.despesas;
    return {
      month: item.month,
      entradas: item.receitas,
      saidas: item.despesas,
      saldo: Math.round(cumulativeSaldo * 100) / 100,
    };
  });

  // --- Expense Breakdown by Chart of Account ---
  // BUG-03 FIX: Exclude cancelled entries from expense breakdown
  const expensesByAccount = await prisma.officialEntry.groupBy({
    by: ["chartOfAccountId"],
    where: {
      tenantId,
      category: "PAYABLE",
      status: { not: "CANCELLED" },
      competenceDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });

  let expenseBreakdown: ExpenseBreakdownDataPoint[] = [];
  if (expensesByAccount.length > 0) {
    const accountIds = expensesByAccount.map((e) => e.chartOfAccountId);
    const accounts = await prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    expenseBreakdown = expensesByAccount.map((e) => ({
      name: accountMap.get(e.chartOfAccountId) ?? "Outros",
      value: Math.round(Number(e._sum.amount ?? 0) * 100) / 100,
    }));
  }

  // --- Aging Buckets ---
  const openEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "PARTIAL"] },
      category: { in: ["PAYABLE", "RECEIVABLE"] },
    },
    select: {
      category: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
    },
  });

  const agingBuckets: Record<string, { pagar: number; receber: number }> = {
    "A vencer": { pagar: 0, receber: 0 },
    "1-30 dias": { pagar: 0, receber: 0 },
    "31-60 dias": { pagar: 0, receber: 0 },
    "61-90 dias": { pagar: 0, receber: 0 },
    ">90 dias": { pagar: 0, receber: 0 },
  };

  const todayMs = now.getTime();
  for (const entry of openEntries) {
    const remaining =
      Number(entry.amount) - Number(entry.paidAmount ?? 0);
    if (remaining <= 0) continue;

    const dueDate = entry.dueDate ? new Date(entry.dueDate) : null;
    let bucketKey: string;

    if (!dueDate || dueDate.getTime() >= todayMs) {
      bucketKey = "A vencer";
    } else {
      const daysOverdue = Math.floor(
        (todayMs - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue <= 30) bucketKey = "1-30 dias";
      else if (daysOverdue <= 60) bucketKey = "31-60 dias";
      else if (daysOverdue <= 90) bucketKey = "61-90 dias";
      else bucketKey = ">90 dias";
    }

    const bucket = agingBuckets[bucketKey];
    if (entry.category === "PAYABLE") {
      bucket.pagar += remaining;
    } else {
      bucket.receber += remaining;
    }
  }

  const aging: AgingDataPoint[] = Object.entries(agingBuckets).map(
    ([bucket, values]) => ({
      bucket,
      pagar: Math.round(values.pagar * 100) / 100,
      receber: Math.round(values.receber * 100) / 100,
    })
  );

  return {
    kpis: {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      contasVencidas: overdueCount,
      receitasTrend,
      despesasTrend,
    },
    revenueExpense,
    cashFlow,
    expenseBreakdown,
    aging,
  };
}
