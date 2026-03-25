import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { AccountType } from "@/generated/prisma";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  REVENUE: "Receitas",
  EXPENSE: "Despesas",
};

export default async function IncomeStatementPage() {
  const user = await getCurrentUser();

  const currentYear = new Date().getFullYear();

  // Get all settled entries for the current year, grouped by chart of account
  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: "SETTLED",
      date: {
        gte: new Date(`${currentYear}-01-01`),
        lte: new Date(`${currentYear}-12-31`),
      },
    },
    include: {
      chartOfAccount: {
        select: { id: true, code: true, name: true, type: true },
      },
    },
  });

  // Group by account type and month
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthLabels = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  type AccountRow = {
    code: string;
    name: string;
    type: string;
    monthly: number[];
    ytd: number;
  };

  const accountMap = new Map<string, AccountRow>();

  for (const entry of entries) {
    if (!entry.chartOfAccount) continue;
    const { id, code, name, type } = entry.chartOfAccount;
    if (type !== "REVENUE" && type !== "EXPENSE") continue;

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
    const month = new Date(entry.date).getMonth();
    row.monthly[month] += Number(entry.amount);
    row.ytd += Number(entry.amount);
  }

  const revenues = Array.from(accountMap.values())
    .filter((r) => r.type === "REVENUE")
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenses = Array.from(accountMap.values())
    .filter((r) => r.type === "EXPENSE")
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalRevenue = revenues.reduce((sum, r) => sum + r.ytd, 0);
  const totalExpense = expenses.reduce((sum, r) => sum + r.ytd, 0);
  const netIncome = totalRevenue - totalExpense;

  const revenueMonthly = months.map((_, i) =>
    revenues.reduce((sum, r) => sum + r.monthly[i], 0)
  );
  const expenseMonthly = months.map((_, i) =>
    expenses.reduce((sum, r) => sum + r.monthly[i], 0)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="DRE - Demonstracao do Resultado"
        description={`Exercicio ${currentYear}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Receita Total</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Despesa Total</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {formatCurrency(totalExpense)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Resultado Liquido</p>
          <p
            className={`text-lg sm:text-2xl font-bold ${
              netIncome >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(netIncome)}
          </p>
        </Card>
      </div>

      {/* DRE Table */}
      <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-3 text-left font-medium sticky left-0 bg-muted/50">
                Conta
              </th>
              {monthLabels.map((m) => (
                <th key={m} className="px-3 py-3 text-right font-medium whitespace-nowrap">
                  {m}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium">YTD</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue section */}
            <tr className="bg-green-50">
              <td colSpan={14} className="px-3 py-2 font-bold text-green-800">
                RECEITAS
              </td>
            </tr>
            {revenues.map((row) => (
              <tr key={row.code} className="border-b">
                <td className="px-3 py-2 sticky left-0 bg-background">
                  {row.code} - {row.name}
                </td>
                {row.monthly.map((val, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {val > 0 ? formatCurrency(val) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-medium">
                  {formatCurrency(row.ytd)}
                </td>
              </tr>
            ))}
            <tr className="border-b bg-green-50 font-bold">
              <td className="px-3 py-2 sticky left-0 bg-green-50">Total Receitas</td>
              {revenueMonthly.map((val, i) => (
                <td key={i} className="px-3 py-2 text-right">
                  {formatCurrency(val)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">{formatCurrency(totalRevenue)}</td>
            </tr>

            {/* Expense section */}
            <tr className="bg-red-50">
              <td colSpan={14} className="px-3 py-2 font-bold text-red-800">
                DESPESAS
              </td>
            </tr>
            {expenses.map((row) => (
              <tr key={row.code} className="border-b">
                <td className="px-3 py-2 sticky left-0 bg-background">
                  {row.code} - {row.name}
                </td>
                {row.monthly.map((val, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {val > 0 ? formatCurrency(val) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-medium">
                  {formatCurrency(row.ytd)}
                </td>
              </tr>
            ))}
            <tr className="border-b bg-red-50 font-bold">
              <td className="px-3 py-2 sticky left-0 bg-red-50">Total Despesas</td>
              {expenseMonthly.map((val, i) => (
                <td key={i} className="px-3 py-2 text-right">
                  {formatCurrency(val)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">{formatCurrency(totalExpense)}</td>
            </tr>

            {/* Net income */}
            <tr className="bg-muted font-bold text-lg">
              <td className="px-3 py-3 sticky left-0 bg-muted">RESULTADO LIQUIDO</td>
              {months.map((_, i) => (
                <td key={i} className="px-3 py-3 text-right">
                  {formatCurrency(revenueMonthly[i] - expenseMonthly[i])}
                </td>
              ))}
              <td className="px-3 py-3 text-right">{formatCurrency(netIncome)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
