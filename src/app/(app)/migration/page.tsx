import { getMigrationStats, listMigrationBatches } from "@/lib/actions/migration";
import { PageHeader } from "@/components/layout/page-header";
import { MigrationOverviewClient } from "./client";

export default async function MigrationOverviewPage() {
  let stats = { total: 0, inProgress: 0, pendingApproval: 0, completed: 0, failed: 0 };
  let serializedBatches: any[] = [];

  try {
    const [rawStats, batches] = await Promise.all([
      getMigrationStats(),
      listMigrationBatches(),
    ]);
    stats = rawStats;

    serializedBatches = batches.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      status: b.status,
      sourceErpName: b.sourceErpName,
      fileName: b.fileName,
      totalRows: b.totalRows,
      processedRows: b.importedRows,
      errorRows: b.errorRows,
      skippedRows: b.skippedRows,
      createdBy: b.createdBy?.name ?? null,
      approvedBy: b.approvedBy?.name ?? null,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt),
      completedAt: b.completedAt instanceof Date ? b.completedAt.toISOString() : b.completedAt ? String(b.completedAt) : null,
      itemCount: b._count.items,
      errorCount: b._count.errors,
    }));
  } catch (err: any) {
    console.error("[MigrationOverviewPage] Error loading data:", err?.message || err);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Migracao"
        description="Importe, exporte e gerencie dados em massa com seguranca contabil"
      />
      <MigrationOverviewClient stats={stats} batches={serializedBatches} />
    </div>
  );
}
