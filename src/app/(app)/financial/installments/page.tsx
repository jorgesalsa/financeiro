import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus } from "@/generated/prisma";

export default async function InstallmentsPage() {
  const user = await getCurrentUser();

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      installmentGroupId: { not: null },
    },
    orderBy: [{ installmentGroupId: "asc" }, { installmentNumber: "asc" }],
    include: {
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
    },
    take: 500,
  });

  // Group by installmentGroupId
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const groupId = entry.installmentGroupId!;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push(entry);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcelamentos"
        description="Acompanhe o progresso de lancamentos parcelados"
      />
      {groups.size === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhum parcelamento encontrado.
        </p>
      ) : (
        Array.from(groups.entries()).map(([groupId, items]) => {
          const total = items.reduce((sum, e) => sum + Number(e.amount), 0);
          const paid = items.reduce((sum, e) => sum + Number(e.paidAmount ?? 0), 0);
          const settled = items.filter((e) => e.status === "SETTLED").length;
          const counterpart =
            items[0]?.supplier?.name ?? items[0]?.customer?.name ?? "—";

          return (
            <Card key={groupId} className="p-3 sm:p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{items[0]?.description}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {counterpart} — {settled}/{items.length} pagas —{" "}
                    {formatCurrency(paid)} / {formatCurrency(total)}
                  </p>
                </div>
                <div className="w-full sm:w-32 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${total > 0 ? (paid / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="rounded-md border min-w-[400px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Parcela</th>
                      <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                      <th className="px-3 py-2 text-right font-medium">Pago</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {item.installmentNumber ?? "—"}/{items.length}
                        </td>
                        <td className="px-3 py-2">
                          {item.dueDate ? formatDate(item.dueDate) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(Number(item.amount))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(Number(item.paidAmount ?? 0))}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                              ENTRY_STATUS_COLORS[item.status as EntryStatus]
                            }`}
                          >
                            {ENTRY_STATUS_LABELS[item.status as EntryStatus]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
