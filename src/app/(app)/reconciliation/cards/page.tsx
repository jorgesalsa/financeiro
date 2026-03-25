import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CARD_STATUS_LABELS } from "@/lib/constants/statuses";
import type { CardTransactionStatus } from "@/generated/prisma";

const CARD_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SETTLED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default async function CardReconciliationPage() {
  const user = await getCurrentUser();

  const transactions = await prisma.cardTransaction.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { transactionDate: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliacao de Cartoes"
        description="Transacoes de cartao de credito e debito"
      />
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="rounded-md border border-border min-w-[600px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Data</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Descricao</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Bandeira</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Ultimos 4</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Valor</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Parcela</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma transacao de cartao encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">{tx.description}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">{tx.cardBrand ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">{tx.lastFourDigits ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">{formatCurrency(Number(tx.grossAmount))}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                    {tx.installmentNumber && tx.totalInstallments
                      ? `${tx.installmentNumber}/${tx.totalInstallments}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        CARD_STATUS_COLORS[tx.status] ?? ""
                      }`}
                    >
                      {CARD_STATUS_LABELS[tx.status as CardTransactionStatus] ?? tx.status}
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
  );
}
