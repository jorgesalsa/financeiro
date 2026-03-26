import { listAllUserTenants } from "@/lib/actions/admin";
import { PageHeader } from "@/components/layout/page-header";
import { CompaniesClient } from "./client";

export default async function CompaniesPage() {
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
    exceptions: m.exceptions,
  }));

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
