import { listAllAdminTenantData } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { AccessClient } from "./client";

export default async function AccessPage() {
  const [tenantData, currentUser] = await Promise.all([
    listAllAdminTenantData(),
    getCurrentUser(),
  ]);

  if (tenantData.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Controle de Acesso"
          description="Gerencie usuários em todas as suas empresas sem precisar trocar de empresa"
        />
        <p className="text-sm text-muted-foreground">
          Você não é administrador de nenhuma empresa. Para gerenciar acessos,
          peça para um administrador conceder a você a permissão de administrador.
        </p>
      </div>
    );
  }

  // Serialize all Date objects → ISO strings before crossing server/client boundary
  const serializedTenants = tenantData.map((td) => ({
    tenantId: td.tenantId,
    tenantName: td.tenant.name,
    tenantSlug: td.tenant.slug,
    tenantActive: td.tenant.active,
    isCurrentTenant: td.isCurrentTenant,
    members: td.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user?.name || m.user?.email || "",
      userEmail: m.user?.email ?? "",
      role: m.role as string,
      isDefault: m.isDefault,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    })),
    invites: td.invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role as string,
      status: i.status as string,
      token: i.token,
      expiresAt: i.expiresAt instanceof Date ? i.expiresAt.toISOString() : String(i.expiresAt),
      createdByName: i.createdBy?.name ?? i.createdBy?.email ?? "",
      createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Acesso"
        description="Gerencie usuários em todas as suas empresas sem precisar trocar de empresa"
      />
      <AccessClient
        tenants={serializedTenants}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
