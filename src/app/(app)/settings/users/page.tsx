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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios & Permissoes"
        description="Gerencie o acesso a empresa atual"
      />
      <UsersClient
        members={members}
        invites={invites}
        currentUserId={user.id}
        tenantName={user.tenantSlug}
      />
    </div>
  );
}
