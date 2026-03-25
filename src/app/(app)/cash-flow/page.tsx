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

  // Realized: settled entries in last 30 days
  const settledEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: "SETTLED",
      date: { gte: pastDate, lte: today },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      category: true,
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

  // Group realized by date
  const realizedByDate = new Map<string, { inflow: number; outflow: number }>();
  for (const entry of settledEntries) {
    const dateKey = new Date(entry.date).toISOString().split("T")[0];
    if (!realizedByDate.has(dateKey))
      realizedByDate.set(dateKey, { inflow: 0, outflow: 0 });
    const bucket = realizedByDate.get(dateKey)!;
    if (entry.type === "CREDIT") {
      bucket.inflow += Number(entry.amount);
    } else {
      bucket.outflow += Number(entry.amount);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        description="Realizado (30 dias) e Projetado (60 dias)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Saldo Atual</p>
          <p className="text-lg sm:text-2xl font-bold">{formatCurrency(currentBalance)}</p>
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
          Ultimos 30 dias
        </h2>
        <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Data</th>
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
                        {inflow > 0 ? formatCurrency(inflow) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {outflow > 0 ? formatCurrency(outflow) : "—"}
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
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Data</th>
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
                        {inflow > 0 ? formatCurrency(inflow) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {outflow > 0 ? formatCurrency(outflow) : "—"}
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
