import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { listAllUserTenants } from "@/lib/actions/admin";
import { MultiTenantDashboardClient } from "./client";

export default async function MultiTenantDashboardPage() {
  const user = await getCurrentUser();
  const tenants = await listAllUserTenants();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Geral"
        description="Visao consolidada de todas as empresas"
      />
      <MultiTenantDashboardClient tenants={tenants} />
    </div>
  );
}
