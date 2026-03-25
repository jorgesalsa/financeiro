import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus } from "@/generated/prisma";

export default async function ReceivablesPage() {
  const user = await getCurrentUser();

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      category: "RECEIVABLE",
    },
    orderBy: { dueDate: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      customer: { select: { name: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description="Lancamentos de contas a receber"
      />
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Vencimento</th>
              <th className="px-4 py-3 text-left font-medium">Descricao</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Conta</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Recebido</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma conta a receber encontrada.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="px-4 py-3">
                    {entry.dueDate ? formatDate(entry.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className="px-4 py-3">{entry.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {entry.chartOfAccount
                      ? `${entry.chartOfAccount.code} - ${entry.chartOfAccount.name}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(entry.amount))}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(entry.paidAmount ?? 0))}</td>
                  <td className="px-4 py-3">
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
  );
}
