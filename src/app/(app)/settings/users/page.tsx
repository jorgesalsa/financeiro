import {
  listTenantMembers,
  listTenantInvites,
} from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { UsersClient } from "./client";

export default async function UsersPage() {
  const [members, invites, user] = await Promise.all([
    listTenantMembers(),
    listTenantInvites(),
    getCurrentUser(),
  ]);

  // Serialize for client types
  const serializedMembers = members.map((m: any) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user?.name ?? "",
    userEmail: m.user?.email ?? "",
    role: m.role,
    isDefault: m.isDefault,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
  }));

  const serializedInvites = invites.map((i: any) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    status: i.status,
    token: i.token,
    expiresAt: i.expiresAt instanceof Date ? i.expiresAt.toISOString() : String(i.expiresAt),
    createdByName: i.createdBy?.name ?? "",
    createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios & Permissoes"
        description="Gerencie o acesso a empresa atual"
      />
      <UsersClient
        members={serializedMembers}
        invites={serializedInvites}
        currentUserId={user.id}
        tenantName={user.tenantSlug}
      />
    </div>
  );
}
