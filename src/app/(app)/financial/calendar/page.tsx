import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus } from "@/generated/prisma";

export default async function FinancialCalendarPage() {
  const user = await getCurrentUser();

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 90);

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ["OPEN", "PARTIAL"] },
      dueDate: {
        gte: today,
        lte: futureDate,
      },
    },
    orderBy: { dueDate: "asc" },
    include: {
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
    },
    take: 500,
  });

  // Group by date
  const groupedByDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    const dateKey = entry.dueDate
      ? new Date(entry.dueDate).toISOString().split("T")[0]
      : "sem-data";
    if (!groupedByDate.has(dateKey)) groupedByDate.set(dateKey, []);
    groupedByDate.get(dateKey)!.push(entry);
  }

  const sortedDates = Array.from(groupedByDate.keys()).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Financeiro"
        description="Vencimentos dos proximos 90 dias"
      />

      {sortedDates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhum vencimento nos proximos 90 dias.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const items = groupedByDate.get(dateKey)!;
            const totalPayable = items
              .filter((e) => e.category === "PAYABLE")
              .reduce((sum, e) => sum + (Number(e.amount) - Number(e.paidAmount ?? 0)), 0);
            const totalReceivable = items
              .filter((e) => e.category === "RECEIVABLE")
              .reduce((sum, e) => sum + (Number(e.amount) - Number(e.paidAmount ?? 0)), 0);

            return (
              <Card key={dateKey} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">
                    {dateKey !== "sem-data" ? formatDate(dateKey) : "Sem data"}
                  </h3>
                  <div className="flex gap-4 text-sm">
                    {totalPayable > 0 && (
                      <span className="text-red-600">
                        Saidas: {formatCurrency(totalPayable)}
                      </span>
                    )}
                    {totalReceivable > 0 && (
                      <span className="text-green-600">
                        Entradas: {formatCurrency(totalReceivable)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {items.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            entry.category === "PAYABLE"
                              ? "text-red-600 border-red-200"
                              : "text-green-600 border-green-200"
                          }
                        >
                          {entry.category === "PAYABLE" ? "Pagar" : "Receber"}
                        </Badge>
                        <span className="text-sm">{entry.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.supplier?.name ?? entry.customer?.name ?? ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            ENTRY_STATUS_COLORS[entry.status as EntryStatus]
                          }`}
                        >
                          {ENTRY_STATUS_LABELS[entry.status as EntryStatus]}
                        </span>
                        <span className="font-medium text-sm">
                          {formatCurrency(Number(entry.amount) - Number(entry.paidAmount ?? 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
