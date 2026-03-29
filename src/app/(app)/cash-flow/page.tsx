import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function CashFlowPage() {
  const user = await getCurrentUser();

  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30);
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 60);

  // BUG-02 FIX: Realized = Settlements (actual money movement), grouped by settlementDate
  const settlements = await prisma.settlement.findMany({
    where: {
      tenantId: user.tenantId,
      settlementDate: { gte: pastDate, lte: today },
    },
    orderBy: { settlementDate: "asc" },
    select: {
      id: true,
      settlementDate: true,
      amount: true,
      interestAmount: true,
      fineAmount: true,
      discountAmount: true,
      officialEntry: {
        select: {
          type: true,
          category: true,
          description: true,
        },
      },
    },
    take: 500,
  });

  // Projected: open entries with due dates in next 60 days
  const projectedEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ["OPEN", "PARTIAL"] },
      dueDate: { gte: today, lte: futureDate },
    },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      dueDate: true,
      description: true,
      amount: true,
      paidAmount: true,
      type: true,
      category: true,
    },
    take: 500,
  });

  // Get current bank balance
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { tenantId: user.tenantId, active: true },
    select: { currentBalance: true },
  });
  const currentBalance = bankAccounts.reduce(
    (sum, ba) => sum + Number(ba.currentBalance),
    0
  );

  // Group realized by settlement date (actual payment date)
  const realizedByDate = new Map<string, { inflow: number; outflow: number }>();
  for (const s of settlements) {
    const dateKey = new Date(s.settlementDate).toISOString().split("T")[0];
    if (!realizedByDate.has(dateKey))
      realizedByDate.set(dateKey, { inflow: 0, outflow: 0 });
    const bucket = realizedByDate.get(dateKey)!;
    // Total cash movement = amount + interest + fine - discount
    const cashAmount =
      Number(s.amount) +
      Number(s.interestAmount ?? 0) +
      Number(s.fineAmount ?? 0) -
      Number(s.discountAmount ?? 0);
    if (s.officialEntry.category === "RECEIVABLE") {
      bucket.inflow += cashAmount;
    } else {
      bucket.outflow += cashAmount;
    }
  }

  // Group projected by date
  const projectedByDate = new Map<string, { inflow: number; outflow: number }>();
  for (const entry of projectedEntries) {
    const dateKey = entry.dueDate
      ? new Date(entry.dueDate).toISOString().split("T")[0]
      : "sem-data";
    if (!projectedByDate.has(dateKey))
      projectedByDate.set(dateKey, { inflow: 0, outflow: 0 });
    const bucket = projectedByDate.get(dateKey)!;
    const remaining = Number(entry.amount) - Number(entry.paidAmount ?? 0);
    if (entry.category === "RECEIVABLE") {
      bucket.inflow += remaining;
    } else {
      bucket.outflow += remaining;
    }
  }

  const realizedDates = Array.from(realizedByDate.keys()).sort();
  const projectedDates = Array.from(projectedByDate.keys()).sort();

  // Realized totals for summary cards
  const realizedTotalInflow = Array.from(realizedByDate.values()).reduce(
    (sum, d) => sum + d.inflow,
    0
  );
  const realizedTotalOutflow = Array.from(realizedByDate.values()).reduce(
    (sum, d) => sum + d.outflow,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        description="Realizado (30 dias) e Projetado (60 dias)"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Saldo Atual</p>
          <p className="text-lg sm:text-2xl font-bold">{formatCurrency(currentBalance)}</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Realizado Entradas</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(realizedTotalInflow)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Projetado Entradas</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {formatCurrency(
              Array.from(projectedByDate.values()).reduce(
                (sum, d) => sum + d.inflow,
                0
              )
            )}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Projetado Saidas</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {formatCurrency(
              Array.from(projectedByDate.values()).reduce(
                (sum, d) => sum + d.outflow,
                0
              )
            )}
          </p>
        </Card>
      </div>

      {/* Realized table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          <Badge variant="outline" className="mr-2">Realizado</Badge>
          Ultimos 30 dias (por data de pagamento)
        </h2>
        <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Data Pgto</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Entradas</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Saidas</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Saldo Dia</th>
              </tr>
            </thead>
            <tbody>
              {realizedDates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum movimento realizado.
                  </td>
                </tr>
              ) : (
                realizedDates.map((dateKey) => {
                  const { inflow, outflow } = realizedByDate.get(dateKey)!;
                  return (
                    <tr key={dateKey} className="border-b">
                      <td className="px-4 py-3">{formatDate(dateKey)}</td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {inflow > 0 ? formatCurrency(inflow) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {outflow > 0 ? formatCurrency(outflow) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(inflow - outflow)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projected table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          <Badge variant="outline" className="mr-2">Projetado</Badge>
          Proximos 60 dias
        </h2>
        <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Vencimento</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Entradas</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Saidas</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Saldo Dia</th>
              </tr>
            </thead>
            <tbody>
              {projectedDates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum vencimento projetado.
                  </td>
                </tr>
              ) : (
                projectedDates.map((dateKey) => {
                  const { inflow, outflow } = projectedByDate.get(dateKey)!;
                  return (
                    <tr key={dateKey} className="border-b">
                      <td className="px-4 py-3">
                        {dateKey !== "sem-data" ? formatDate(dateKey) : "Sem data"}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {inflow > 0 ? formatCurrency(inflow) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {outflow > 0 ? formatCurrency(outflow) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(inflow - outflow)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
