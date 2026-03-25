import { listSuppliers } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { SuppliersClient } from "./client";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Gerencie os fornecedores cadastrados"
      />
      <SuppliersClient data={suppliers} />
    </div>
  );
}
