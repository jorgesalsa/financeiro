import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  STAGING_STATUS_LABELS,
  STAGING_STATUS_COLORS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { StagingStatus, EntryStatus } from "@/generated/prisma";

export default async function PendingItemsPage() {
  const user = await getCurrentUser();

  const [pendingStaging, unsettledEntries, unreconciledLines] =
    await Promise.all([
      prisma.stagingEntry.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ["PENDING", "AUTO_CLASSIFIED", "VALIDATED"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          status: true,
        },
        take: 50,
      }),
      prisma.officialEntry.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ["OPEN", "PARTIAL"] },
        },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          category: true,
        },
        take: 50,
      }),
      prisma.bankStatementLine.count({
        where: {
          tenantId: user.tenantId,
          reconciliation: { is: null },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itens Pendentes"
        description="Visao central de todas as pendencias do sistema"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">
            {pendingStaging.length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Staging Pendente
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-orange-600">
            {unsettledEntries.length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Lanc. em Aberto
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-blue-600">
            {unreconciledLines}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Nao Conciliadas
          </p>
        </Card>
      </div>

      {/* Pending Staging */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Staging Pendente de Validacao/Incorporacao
        </h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="rounded-md border border-border min-w-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Data</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Descricao</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingStaging.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum lancamento no staging pendente.
                  </td>
                </tr>
              ) : (
                pendingStaging.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{entry.description}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {formatCurrency(Number(entry.amount))}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          STAGING_STATUS_COLORS[entry.status as StagingStatus]
                        }`}
                      >
                        {STAGING_STATUS_LABELS[entry.status as StagingStatus]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Unsettled Entries */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Lancamentos em Aberto
        </h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="rounded-md border border-border min-w-[550px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Vencimento</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Descricao</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {unsettledEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum lancamento em aberto.
                  </td>
                </tr>
              ) : (
                unsettledEntries.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                      {entry.dueDate ? formatDate(entry.dueDate) : "—"}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{entry.description}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <Badge variant="outline">
                        {entry.category === "PAYABLE" ? "Pagar" : "Receber"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {formatCurrency(Number(entry.amount))}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {formatCurrency(Number(entry.amount) - Number(entry.paidAmount ?? 0))}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          ENTRY_STATUS_COLORS[entry.status as EntryStatus]
                        }`}
                      >
                        {ENTRY_STATUS_LABELS[entry.status as EntryStatus]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
