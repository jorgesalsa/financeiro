import { listProducts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { ProductsClient } from "./client";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Gerencie os produtos e serviços cadastrados"
      />
      <ProductsClient data={products.map((p) => ({
        ...p,
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        minStock: Number(p.minStock),
        reorderPoint: Number(p.reorderPoint),
      }))} />
    </div>
  );
}
