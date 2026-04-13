import { listMigrationBatches } from "@/lib/actions/migration";
import { PageHeader } from "@/components/layout/page-header";
import { MigrationHistoryClient } from "./client";

export default async function MigrationHistoryPage() {
  let serializedBatches: any[] = [];

  try {
    const batches = await listMigrationBatches();

    serializedBatches = batches.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      status: b.status,
      sourceErpName: b.sourceErpName ?? null,
      fileName: b.fileName ?? null,
      totalRows: b.totalRows,
      processedRows: b.importedRows,
      errorRows: b.errorRows,
      skippedRows: b.skippedRows,
      createdBy: b.createdBy?.name ?? null,
      approvedBy: b.approvedBy?.name ?? null,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt ?? ""),
      completedAt: b.completedAt instanceof Date ? b.completedAt.toISOString() : b.completedAt ? String(b.completedAt) : null,
      itemCount: b._count.items,
      errorCount: b._count.errors,
    }));
  } catch (err: any) {
    console.error("[MigrationHistoryPage] Error loading data:", err?.message || err);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historico de Migracoes"
        description="Todos os lotes de importacao e exportacao"
      />
      <MigrationHistoryClient batches={serializedBatches} />
    </div>
  );
}
