import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

export default async function BudgetVsActualPage() {
  const user = await getCurrentUser();

  const currentYear = new Date().getFullYear();

  // Fetch budget lines for the current year
  const budgetLines = await prisma.budgetLine.findMany({
    where: {
      tenantId: user.tenantId,
      year: currentYear,
    },
    include: {
      chartOfAccount: { select: { code: true, name: true, type: true } },
    },
    orderBy: [
      { chartOfAccount: { code: "asc" } },
      { month: "asc" },
    ],
  });

  // Fetch actual entries for the year
  const actualEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: "SETTLED",
      date: {
        gte: new Date(`${currentYear}-01-01`),
        lte: new Date(`${currentYear}-12-31`),
      },
    },
    select: {
      chartOfAccountId: true,
      amount: true,
      date: true,
    },
  });

  // Aggregate actuals by chartOfAccountId + month
  const actualMap = new Map<string, number>();
  for (const entry of actualEntries) {
    const month = new Date(entry.date).getMonth() + 1;
    const key = `${entry.chartOfAccountId}-${month}`;
    actualMap.set(key, (actualMap.get(key) ?? 0) + Number(entry.amount));
  }

  // Build comparison rows per account
  type ComparisonRow = {
    code: string;
    name: string;
    type: string;
    months: { month: number; budget: number; actual: number; variance: number }[];
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
  };

  const accountRows = new Map<string, ComparisonRow>();

  for (const bl of budgetLines) {
    if (!bl.chartOfAccount) continue;
    const accountId = bl.chartOfAccountId;

    if (!accountRows.has(accountId)) {
      accountRows.set(accountId, {
        code: bl.chartOfAccount.code,
        name: bl.chartOfAccount.name,
        type: bl.chartOfAccount.type,
        months: [],
        totalBudget: 0,
        totalActual: 0,
        totalVariance: 0,
      });
    }

    const row = accountRows.get(accountId)!;
    const actual = actualMap.get(`${accountId}-${bl.month}`) ?? 0;
    const budgetNum = Number(bl.budgetAmount);
    const variance = actual - budgetNum;

    row.months.push({
      month: bl.month,
      budget: budgetNum,
      actual,
      variance,
    });

    row.totalBudget += budgetNum;
    row.totalActual += actual;
    row.totalVariance += variance;
  }

  const rows = Array.from(accountRows.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  const monthLabels = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orcado vs Realizado"
        description={`Comparacao orcamentaria - ${currentYear}`}
      />

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma linha orcamentaria cadastrada para {currentYear}.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Cadastre linhas orcamentarias na configuracao de orcamento.
          </p>
        </Card>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-3 text-left font-medium sticky left-0 bg-muted/50">
                  Conta
                </th>
                <th className="px-3 py-3 text-right font-medium">Orcado Total</th>
                <th className="px-3 py-3 text-right font-medium">Realizado Total</th>
                <th className="px-3 py-3 text-right font-medium">Variacao</th>
                <th className="px-3 py-3 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const variancePct =
                  row.totalBudget > 0
                    ? ((row.totalVariance / row.totalBudget) * 100).toFixed(1)
                    : "—";
                const isOver = row.totalVariance > 0 && row.type === "EXPENSE";
                const isUnder = row.totalVariance < 0 && row.type === "REVENUE";

                return (
                  <tr key={row.code} className="border-b">
                    <td className="px-3 py-3 sticky left-0 bg-background">
                      {row.code} - {row.name}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(row.totalBudget)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(row.totalActual)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium ${
                        isOver || isUnder ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(row.totalVariance)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {variancePct !== "—" ? `${variancePct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
