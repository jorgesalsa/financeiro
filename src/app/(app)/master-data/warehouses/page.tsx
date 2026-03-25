import { listWarehouses } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { WarehousesClient } from "./client";

export default async function WarehousesPage() {
  const warehouses = await listWarehouses();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Almoxarifados"
        description="Gerencie os almoxarifados e depósitos"
      />
      <WarehousesClient data={warehouses} />
    </div>
  );
}
