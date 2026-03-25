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
    <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Vencimento</th>
            <th className="px-3 py-2 text-left font-medium">Descricao</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Fornecedor</th>
            <th className="px-3 py-2 text-left font-medium">Conta</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Valor</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Pago</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Status</th>
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
                <td className="px-3 py-2 whitespace-nowrap">
                  {entry.dueDate ? formatDate(entry.dueDate) : "—"}
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate">{entry.description}</td>
                <td className="px-3 py-2 whitespace-nowrap">{entry.supplier?.name ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {entry.chartOfAccount ? entry.chartOfAccount.code : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(entry.amount)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(entry.paidAmount)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
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
