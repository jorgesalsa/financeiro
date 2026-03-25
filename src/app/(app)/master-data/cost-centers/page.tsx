import { listCostCenters } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { CostCentersClient } from "./client";

export default async function CostCentersPage() {
  const costCenters = await listCostCenters();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de Custo"
        description="Gerencie os centros de custo da empresa"
      />
      <CostCentersClient data={costCenters} />
    </div>
  );
}
