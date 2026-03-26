import { PageHeader } from "@/components/layout/page-header";
import { listAllUserTenants } from "@/lib/actions/admin";
import { MultiTenantDashboardClient } from "./client";

export default async function MultiTenantDashboardPage() {
  const rawTenants = await listAllUserTenants();

  const tenants = rawTenants.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantCnpj: m.tenant.cnpj || "",
    tenantSlug: m.tenant.slug,
    active: m.tenant.active,
    role: m.role,
    isDefault: m.isDefault,
    memberCount: m.memberCount,
    pendingStaging: m.stagingPendingCount,
    overdueCount: m.overdueCount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Geral"
        description="Visão consolidada de todas as empresas"
      />
      <MultiTenantDashboardClient tenants={tenants} />
    </div>
  );
}
