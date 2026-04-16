import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import prisma from "@/lib/db";
import {
  calculateDRE,
  calcVariation,
  formatVariation,
  variationBg,
  type AccountRow,
} from "@/lib/services/reports/dre";

interface PageProps {
  searchParams: Promise<{ costCenterId?: string; year?: string }>;
}

export default async function IncomeStatementPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const currentYear = params.year
    ? parseInt(params.year, 10)
    : new Date().getFullYear();

  // Fetch cost centers for filter dropdown
  const costCenters = await prisma.costCenter.findMany({
    where: { tenantId: user.tenantId, active: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const dreResult = await calculateDRE({
    tenantId: user.tenantId,
    year: currentYear,
    costCenterId: params.costCenterId,
  });

  const {
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
  } = dreResult;

  const monthLabels = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  // Current month index (0-based) for variation column
  const currentMonthIdx = new Date().getMonth();
  const prevMonthIdx = currentMonthIdx > 0 ? currentMonthIdx - 1 : null;

  function renderSection(
    title: string,
    rows: AccountRow[],
    totalLabel: string,
    total: number,
    monthly: number[],
    bgClass: string,
    textClass: string,
  ) {
    const totalVar = prevMonthIdx !== null
      ? calcVariation(monthly[currentMonthIdx], monthly[prevMonthIdx])
      : null;

    return (
      <>
        <tr className={bgClass}>
          <td colSpan={15} className={`px-3 py-2 font-bold ${textClass}`}>
            {title}
          </td>
        </tr>
        {rows.map((row) => {
          const rowVar = prevMonthIdx !== null
            ? calcVariation(row.monthly[currentMonthIdx], row.monthly[prevMonthIdx])
            : null;
          return (
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
              <td className={`px-3 py-2 text-right text-xs font-medium ${variationBg(rowVar)}`}>
                {formatVariation(rowVar)}
              </td>
            </tr>
          );
        })}
        <tr className={`border-b ${bgClass} font-bold`}>
          <td className={`px-3 py-2 sticky left-0 ${bgClass}`}>{totalLabel}</td>
          {monthly.map((val, i) => (
            <td key={i} className="px-3 py-2 text-right">
              {formatCurrency(val)}
            </td>
          ))}
          <td className="px-3 py-2 text-right">{formatCurrency(total)}</td>
          <td className={`px-3 py-2 text-right text-xs font-medium ${variationBg(totalVar)}`}>
            {formatVariation(totalVar)}
          </td>
        </tr>
      </>
    );
  }

  function renderSubtotalRow(label: string, monthly: number[], total: number, bgClass: string) {
    const subVar = prevMonthIdx !== null
      ? calcVariation(monthly[currentMonthIdx], monthly[prevMonthIdx])
      : null;
    return (
      <tr className={`border-b ${bgClass} font-bold`}>
        <td className={`px-3 py-2 sticky left-0 ${bgClass}`}>{label}</td>
        {monthly.map((val, i) => (
          <td key={i} className="px-3 py-2 text-right">
            {formatCurrency(val)}
          </td>
        ))}
        <td className="px-3 py-2 text-right">{formatCurrency(total)}</td>
        <td className={`px-3 py-2 text-right text-xs font-medium ${variationBg(subVar)}`}>
          {formatVariation(subVar)}
        </td>
      </tr>
    );
  }

  const selectedCostCenter = costCenters.find((cc) => cc.id === params.costCenterId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="DRE - Demonstracao do Resultado"
        description={`Exercicio ${currentYear}${selectedCostCenter ? ` | Centro de Custo: ${selectedCostCenter.code} - ${selectedCostCenter.name}` : ""}`}
      />

      {/* Cost Center Filter */}
      {costCenters.length > 0 && (
        <form className="flex items-center gap-3">
          <label htmlFor="costCenter" className="text-sm font-medium text-muted-foreground">
            Centro de Custo:
          </label>
          <select
            name="costCenterId"
            id="costCenter"
            defaultValue={params.costCenterId ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.code} - {cc.name}
              </option>
            ))}
          </select>
          <input type="hidden" name="year" value={currentYear} />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filtrar
          </button>
        </form>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Receita Bruta</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(revenue.total)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Receita Liquida</p>
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
          <p className="text-xs sm:text-sm text-muted-foreground">Resultado Liquido</p>
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
              <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Var %</th>
            </tr>
          </thead>
          <tbody>
            {/* 1. RECEITAS */}
            {renderSection("RECEITAS", revenue.rows, "Total Receita Bruta", revenue.total, revenue.monthly, "bg-green-50", "text-green-800")}

            {/* 2. DEDUCOES */}
            {deductions.rows.length > 0 && (
              <>
                {renderSection("(-) DEDUCOES E IMPOSTOS", deductions.rows, "Total Deducoes", deductions.total, deductions.monthly, "bg-amber-50", "text-amber-800")}
                {renderSubtotalRow("= RECEITA LIQUIDA", netRevenueMonthly, netRevenue, "bg-green-100")}
              </>
            )}

            {/* 3. CUSTOS */}
            {costs.rows.length > 0 && (
              <>
                {renderSection("(-) CUSTOS", costs.rows, "Total Custos", costs.total, costs.monthly, "bg-orange-50", "text-orange-800")}
                {renderSubtotalRow("= LUCRO BRUTO", grossProfitMonthly, grossProfit, "bg-blue-50")}
              </>
            )}

            {/* 4. DESPESAS */}
            {renderSection("(-) DESPESAS OPERACIONAIS", expenses.rows, "Total Despesas", expenses.total, expenses.monthly, "bg-red-50", "text-red-800")}
            {renderSubtotalRow("= RESULTADO OPERACIONAL", operatingResultMonthly, operatingResult, "bg-blue-100")}

            {/* 5. INVESTIMENTOS */}
            {investments.rows.length > 0 && (
              <>
                {renderSection("(-) INVESTIMENTOS E RETIRADAS", investments.rows, "Total Investimentos", investments.total, investments.monthly, "bg-purple-50", "text-purple-800")}
              </>
            )}

            {/* RESULTADO LIQUIDO */}
            <tr className="bg-muted font-bold text-lg">
              <td className="px-3 py-3 sticky left-0 bg-muted">RESULTADO LIQUIDO</td>
              {netResultMonthly.map((val, i) => (
                <td key={i} className="px-3 py-3 text-right">
                  {formatCurrency(val)}
                </td>
              ))}
              <td className="px-3 py-3 text-right">{formatCurrency(netResult)}</td>
              {(() => {
                const nrVar = prevMonthIdx !== null
                  ? calcVariation(netResultMonthly[currentMonthIdx], netResultMonthly[prevMonthIdx])
                  : null;
                return (
                  <td className={`px-3 py-3 text-right text-xs ${variationBg(nrVar)}`}>
                    {formatVariation(nrVar)}
                  </td>
                );
              })()}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
