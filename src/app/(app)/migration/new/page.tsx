import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { NewMigrationClient } from "./client";

export default async function NewMigrationPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Migracao"
        description="Crie um novo lote de importacao de dados"
      />
      <NewMigrationClient userRole={user.memberRole} />
    </div>
  );
}
