import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

export default async function IncomeStatementPage() {
  const user = await getCurrentUser();

  const currentYear = new Date().getFullYear();

  // RA01: Use competenceDate for DRE (not date); exclude TRANSFER category
  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { not: "CANCELLED" },
      category: { not: "TRANSFER" }, // RA06: Exclude internal transfers from DRE
      competenceDate: {
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

  // Financial DRE types: REVENUE, DEDUCTION, COST, EXPENSE, INVESTMENT
  const DRE_TYPES = ["REVENUE", "DEDUCTION", "COST", "EXPENSE", "INVESTMENT"];

  for (const entry of entries) {
    if (!entry.chartOfAccount) continue;
    const { id, code, name, type } = entry.chartOfAccount;
    if (!DRE_TYPES.includes(type)) continue;

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
    // RA01: Use competenceDate for monthly distribution
    const month = new Date(entry.competenceDate).getMonth();
    row.monthly[month] += Number(entry.amount);
    row.ytd += Number(entry.amount);
  }

  const revenues = Array.from(accountMap.values())
    .filter((r) => r.type === "REVENUE")
    .sort((a, b) => a.code.localeCompare(b.code));

  const deductions = Array.from(accountMap.values())
    .filter((r) => r.type === "DEDUCTION")
    .sort((a, b) => a.code.localeCompare(b.code));

  const costs = Array.from(accountMap.values())
    .filter((r) => r.type === "COST")
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenses = Array.from(accountMap.values())
    .filter((r) => r.type === "EXPENSE")
    .sort((a, b) => a.code.localeCompare(b.code));

  const investments = Array.from(accountMap.values())
    .filter((r) => r.type === "INVESTMENT")
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalRevenue = revenues.reduce((sum, r) => sum + r.ytd, 0);
  const totalDeduction = deductions.reduce((sum, r) => sum + r.ytd, 0);
  const totalCost = costs.reduce((sum, r) => sum + r.ytd, 0);
  const totalExpense = expenses.reduce((sum, r) => sum + r.ytd, 0);
  const totalInvestment = investments.reduce((sum, r) => sum + r.ytd, 0);

  const netRevenue = totalRevenue - totalDeduction;
  const grossProfit = netRevenue - totalCost;
  const operatingResult = grossProfit - totalExpense;
  const netResult = operatingResult - totalInvestment;

  const revenueMonthly = months.map((_, i) =>
    revenues.reduce((sum, r) => sum + r.monthly[i], 0)
  );
  const deductionMonthly = months.map((_, i) =>
    deductions.reduce((sum, r) => sum + r.monthly[i], 0)
  );
  const costMonthly = months.map((_, i) =>
    costs.reduce((sum, r) => sum + r.monthly[i], 0)
  );
  const expenseMonthly = months.map((_, i) =>
    expenses.reduce((sum, r) => sum + r.monthly[i], 0)
  );
  const investmentMonthly = months.map((_, i) =>
    investments.reduce((sum, r) => sum + r.monthly[i], 0)
  );

  function renderSection(
    title: string,
    rows: AccountRow[],
    totalLabel: string,
    total: number,
    monthly: number[],
    bgClass: string,
    textClass: string,
  ) {
    return (
      <>
        <tr className={bgClass}>
          <td colSpan={14} className={`px-3 py-2 font-bold ${textClass}`}>
            {title}
          </td>
        </tr>
        {rows.map((row) => (
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
        <tr className={`border-b ${bgClass} font-bold`}>
          <td className={`px-3 py-2 sticky left-0 ${bgClass}`}>{totalLabel}</td>
          {monthly.map((val, i) => (
            <td key={i} className="px-3 py-2 text-right">
              {formatCurrency(val)}
            </td>
          ))}
          <td className="px-3 py-2 text-right">{formatCurrency(total)}</td>
        </tr>
      </>
    );
  }

  function renderSubtotalRow(label: string, monthly: number[], total: number, bgClass: string) {
    return (
      <tr className={`border-b ${bgClass} font-bold`}>
        <td className={`px-3 py-2 sticky left-0 ${bgClass}`}>{label}</td>
        {monthly.map((val, i) => (
          <td key={i} className="px-3 py-2 text-right">
            {formatCurrency(val)}
          </td>
        ))}
        <td className="px-3 py-2 text-right">{formatCurrency(total)}</td>
      </tr>
    );
  }

  const netRevenueMonthly = months.map((_, i) => revenueMonthly[i] - deductionMonthly[i]);
  const grossProfitMonthly = months.map((_, i) => netRevenueMonthly[i] - costMonthly[i]);
  const operatingResultMonthly = months.map((_, i) => grossProfitMonthly[i] - expenseMonthly[i]);
  const netResultMonthly = months.map((_, i) => operatingResultMonthly[i] - investmentMonthly[i]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="DRE - Demonstracao do Resultado"
        description={`Exercicio ${currentYear}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Receita Bruta</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Receita Líquida</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(netRevenue)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Lucro Bruto</p>
          <p className={`text-lg sm:text-2xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(grossProfit)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Resultado Líquido</p>
          <p
            className={`text-lg sm:text-2xl font-bold ${
              netResult >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(netResult)}
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
            {/* 1. RECEITAS */}
            {renderSection("RECEITAS", revenues, "Total Receita Bruta", totalRevenue, revenueMonthly, "bg-green-50", "text-green-800")}

            {/* 2. DEDUÇÕES */}
            {deductions.length > 0 && (
              <>
                {renderSection("(-) DEDUÇÕES E IMPOSTOS", deductions, "Total Deduções", totalDeduction, deductionMonthly, "bg-amber-50", "text-amber-800")}
                {renderSubtotalRow("= RECEITA LÍQUIDA", netRevenueMonthly, netRevenue, "bg-green-100")}
              </>
            )}

            {/* 3. CUSTOS */}
            {costs.length > 0 && (
              <>
                {renderSection("(-) CUSTOS", costs, "Total Custos", totalCost, costMonthly, "bg-orange-50", "text-orange-800")}
                {renderSubtotalRow("= LUCRO BRUTO", grossProfitMonthly, grossProfit, "bg-blue-50")}
              </>
            )}

            {/* 4. DESPESAS */}
            {renderSection("(-) DESPESAS OPERACIONAIS", expenses, "Total Despesas", totalExpense, expenseMonthly, "bg-red-50", "text-red-800")}
            {renderSubtotalRow("= RESULTADO OPERACIONAL", operatingResultMonthly, operatingResult, "bg-blue-100")}

            {/* 5. INVESTIMENTOS */}
            {investments.length > 0 && (
              <>
                {renderSection("(-) INVESTIMENTOS E RETIRADAS", investments, "Total Investimentos", totalInvestment, investmentMonthly, "bg-purple-50", "text-purple-800")}
              </>
            )}

            {/* RESULTADO LIQUIDO */}
            <tr className="bg-muted font-bold text-lg">
              <td className="px-3 py-3 sticky left-0 bg-muted">RESULTADO LÍQUIDO</td>
              {netResultMonthly.map((val, i) => (
                <td key={i} className="px-3 py-3 text-right">
                  {formatCurrency(val)}
                </td>
              ))}
              <td className="px-3 py-3 text-right">{formatCurrency(netResult)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
