import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDecimal } from "@/lib/utils/format";

export default async function StockPositionPage() {
  const user = await getCurrentUser();

  const products = await prisma.product.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      minStock: true,
    },
  });

  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Compute current stock and average cost per product from the latest StockMovement.
  // For each product we fetch the most recent movement to get balanceAfter and averageCostAfter.
  const latestMovements = await Promise.all(
    products.map((p) =>
      prisma.stockMovement.findFirst({
        where: { tenantId: user.tenantId, productId: p.id },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true, averageCostAfter: true },
      })
    )
  );

  // Build enriched product list with computed stock data
  const enrichedProducts = products.map((p, i) => {
    const lastMov = latestMovements[i];
    const currentStock = lastMov ? Number(lastMov.balanceAfter) : 0;
    const averageCost = lastMov ? Number(lastMov.averageCostAfter) : 0;
    return {
      ...p,
      currentStock,
      averageCost,
      minStock: Number(p.minStock),
    };
  });

  const totalValue = enrichedProducts.reduce(
    (sum, p) => sum + p.currentStock * p.averageCost,
    0
  );

  const belowMinimum = enrichedProducts.filter(
    (p) => p.minStock > 0 && p.currentStock < p.minStock
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posicao de Estoque"
        description="Saldo atual de produtos por deposito"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Total de Produtos</p>
          <p className="text-lg sm:text-2xl font-bold">{enrichedProducts.length}</p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Valor em Estoque</p>
          <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Abaixo do Minimo</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{belowMinimum.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="rounded-md border border-border min-w-[700px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Codigo</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Produto</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Unid.</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Qtde Atual</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Qtde Min.</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Custo Medio</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">Valor Total</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Situacao</th>
            </tr>
          </thead>
          <tbody>
            {enrichedProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              enrichedProducts.map((product) => {
                const totalVal = product.currentStock * product.averageCost;
                const isBelowMin =
                  product.minStock > 0 && product.currentStock < product.minStock;

                return (
                  <tr
                    key={product.id}
                    className={`border-b ${isBelowMin ? "bg-red-50" : ""}`}
                  >
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-mono">{product.code}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{product.name}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{product.unit}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {formatDecimal(product.currentStock)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {product.minStock > 0
                        ? formatDecimal(product.minStock)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      {formatCurrency(product.averageCost)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(totalVal)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      {isBelowMin ? (
                        <Badge className="bg-red-100 text-red-800">
                          Abaixo do minimo
                        </Badge>
                      ) : product.currentStock === 0 ? (
                        <Badge className="bg-gray-100 text-gray-800">
                          Sem estoque
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          Normal
                        </Badge>
                      )}
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
