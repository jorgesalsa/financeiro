import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus } from "@/generated/prisma";
import type { ColumnDef } from "@tanstack/react-table";

export default async function PayablesPage() {
  const user = await getCurrentUser();

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      category: "PAYABLE",
    },
    orderBy: { dueDate: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      supplier: { select: { name: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Lancamentos de contas a pagar"
      />
      <PayablesTable data={entries as any[]} />
    </div>
  );
}

function PayablesTable({ data }: { data: any[] }) {
  return (
    <div className="rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Vencimento</th>
            <th className="px-4 py-3 text-left font-medium">Descricao</th>
            <th className="px-4 py-3 text-left font-medium">Fornecedor</th>
            <th className="px-4 py-3 text-left font-medium">Conta</th>
            <th className="px-4 py-3 text-right font-medium">Valor</th>
            <th className="px-4 py-3 text-right font-medium">Pago</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Nenhuma conta a pagar encontrada.
              </td>
            </tr>
          ) : (
            data.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="px-4 py-3">
                  {entry.dueDate ? formatDate(entry.dueDate) : "—"}
                </td>
                <td className="px-4 py-3">{entry.description}</td>
                <td className="px-4 py-3">{entry.supplier?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {entry.chartOfAccount
                    ? `${entry.chartOfAccount.code} - ${entry.chartOfAccount.name}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(entry.amount)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(entry.paidAmount)}</td>
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
  );
}
