import { listAllUserTenants } from "@/lib/actions/admin";
import { PageHeader } from "@/components/layout/page-header";
import { CompaniesClient } from "./client";

export default async function CompaniesPage() {
  const tenants = await listAllUserTenants();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Gerencie suas empresas e clientes"
      />
      <CompaniesClient tenants={tenants} />
    </div>
  );
}
