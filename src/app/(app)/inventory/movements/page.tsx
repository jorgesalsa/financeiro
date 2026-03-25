import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/utils/format";
import type { StockMovementType } from "@/generated/prisma";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Entrada",
  EXIT: "Saida",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferencia",
};

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  ENTRY: "bg-green-100 text-green-800",
  EXIT: "bg-red-100 text-red-800",
  ADJUSTMENT: "bg-yellow-100 text-yellow-800",
  TRANSFER: "bg-blue-100 text-blue-800",
};

export default async function MovementsPage() {
  const user = await getCurrentUser();

  const movements = await prisma.stockMovement.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { code: true, name: true } },
      warehouse: { select: { name: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentacoes de Estoque"
        description="Historico de entradas, saidas, ajustes e transferencias"
      />
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="rounded-md border border-border min-w-[700px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Data</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Produto</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Deposito</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Qtde</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Custo Unit.</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Custo Total</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma movimentacao encontrada.
                </td>
              </tr>
            ) : (
              movements.map((mov) => (
                <tr key={mov.id} className="border-b">
                  <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">{formatDate(mov.createdAt)}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    {mov.product
                      ? `${mov.product.code} - ${mov.product.name}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">{mov.warehouse?.name ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        MOVEMENT_TYPE_COLORS[mov.type] ?? ""
                      }`}
                    >
                      {MOVEMENT_TYPE_LABELS[mov.type] ?? mov.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                    {formatDecimal(Number(mov.quantity))}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                    {formatCurrency(Number(mov.unitCost))}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                    {formatCurrency(Number(mov.totalCost))}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">
                    {formatDecimal(Number(mov.balanceAfter))}
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
