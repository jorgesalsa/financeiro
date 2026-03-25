import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/utils/format";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Entrada",
  EXIT: "Saida",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferencia",
};

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const productId = params.productId;

  const products = await prisma.product.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  let movements: any[] = [];
  let selectedProduct: { id: string; code: string; name: string } | null = null;

  if (productId) {
    selectedProduct =
      products.find((p) => p.id === productId) ?? null;

    movements = await prisma.stockMovement.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        warehouse: { select: { name: true } },
      },
      take: 500,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kardex"
        description="Ficha de estoque por produto"
      />

      {/* Product selector */}
      <Card className="p-4">
        <form className="flex items-end gap-4">
          <div>
            <label className="text-sm font-medium">Produto</label>
            <select
              name="productId"
              defaultValue={productId ?? ""}
              className="flex h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Selecione um produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Consultar
          </button>
        </form>
      </Card>

      {selectedProduct ? (
        <>
          <h2 className="text-lg font-semibold">
            {selectedProduct.code} - {selectedProduct.name}
          </h2>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Deposito</th>
                  <th className="px-4 py-3 text-right font-medium">Quantidade</th>
                  <th className="px-4 py-3 text-right font-medium">Custo Unit.</th>
                  <th className="px-4 py-3 text-right font-medium">Custo Total</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhuma movimentacao para este produto.
                    </td>
                  </tr>
                ) : (
                  movements.map((mov: any) => (
                    <tr key={mov.id} className="border-b">
                      <td className="px-4 py-3">{formatDate(mov.createdAt)}</td>
                      <td className="px-4 py-3">
                        {MOVEMENT_TYPE_LABELS[mov.type] ?? mov.type}
                      </td>
                      <td className="px-4 py-3">{mov.warehouse?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {formatDecimal(mov.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(mov.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(mov.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatDecimal(mov.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Selecione um produto para visualizar o Kardex.
          </p>
        </Card>
      )}
    </div>
  );
}
