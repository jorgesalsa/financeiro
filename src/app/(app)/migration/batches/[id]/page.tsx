import { getMigrationBatch, getMigrationItems, getMigrationErrors } from "@/lib/actions/migration";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { BatchDetailClient } from "./client";
import Link from "next/link";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let serializedBatch: any = null;
  let serializedItems: any[] = [];
  let serializedErrors: any[] = [];
  let itemsPagination = { page: 1, totalPages: 1, total: 0 };
  let userRole: import("@/generated/prisma").Role = "VIEWER";
  let batchName = "Lote";
  let batchDescription = "Detalhe do lote de migracao";

  try {
    const [batch, user, itemsResult, errors] = await Promise.all([
      getMigrationBatch(id),
      getCurrentUser(),
      getMigrationItems(id, { page: 1, pageSize: 50 }),
      getMigrationErrors(id),
    ]);

    userRole = user.memberRole;
    batchName = batch.name;
    batchDescription = batch.description ?? "Detalhe do lote de migracao";

    // Helper: deep-clone via JSON to strip any non-serializable Prisma artefacts
    const safeJson = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

    serializedBatch = {
      id: batch.id,
      name: batch.name,
      type: batch.type,
      status: batch.status,
      description: batch.description ?? null,
      sourceErpName: batch.sourceErpName ?? null,
      fileName: batch.fileName ?? null,
      fileSize: batch.fileSize ?? null,
      fileHash: batch.fileHash ?? null,
      totalRows: batch.totalRows,
      processedRows: batch.importedRows,
      errorRows: batch.errorRows,
      skippedRows: batch.skippedRows,
      expectedTotalAmount: batch.expectedTotalAmount != null ? Number(batch.expectedTotalAmount) : null,
      actualTotalAmount: batch.calculatedTotalAmount != null ? Number(batch.calculatedTotalAmount) : null,
      confidenceScore: null,
      createdBy: batch.createdBy?.name ?? null,
      approvedBy: batch.approvedBy?.name ?? null,
      createdAt: batch.createdAt instanceof Date ? batch.createdAt.toISOString() : String(batch.createdAt ?? ""),
      completedAt: batch.completedAt instanceof Date ? batch.completedAt.toISOString() : batch.completedAt ? String(batch.completedAt) : null,
      entitySummaries: batch.entitySummaries.map((s) => ({
        entityType: s.entityType,
        totalItems: s.totalRows,
        validItems: s.validRows,
        errorItems: s.errorRows,
        warningItems: s.warningRows,
        importedItems: s.importedRows,
      })),
      itemCount: batch._count.items,
      errorCount: batch._count.errors,
    };

    serializedItems = itemsResult.items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      sheetName: item.sheetName ?? "",
      rowNumber: item.rowNumber,
      status: item.status,
      rawData: safeJson(item.rawData ?? null),
      mappedData: safeJson(item.mappedData ?? null),
      correctedData: safeJson(item.correctedData ?? null),
      confidenceScore: item.confidenceScore ?? null,
      errors: item.errors.map((e) => ({
        id: e.id,
        severity: e.severity,
        code: e.code,
        field: e.field ?? null,
        message: e.message,
        suggestion: e.suggestion ?? null,
        resolved: e.resolved,
      })),
    }));

    serializedErrors = errors.map((e) => ({
      id: e.id,
      severity: e.severity,
      code: e.code,
      field: e.field ?? null,
      message: e.message,
      suggestion: e.suggestion ?? null,
      resolved: e.resolved,
      rowNumber: e.item?.rowNumber ?? null,
      entityType: e.item?.entityType ?? null,
      sheetName: e.item?.sheetName ?? null,
      itemStatus: (e.item as any)?.status ?? null,
    }));

    itemsPagination = { page: itemsResult.page, totalPages: itemsResult.totalPages, total: itemsResult.total };
  } catch (err: any) {
    console.error("[BatchDetailPage] Error loading data:", err?.message || err);
    return (
      <div className="space-y-6">
        <PageHeader title="Erro ao carregar lote" description="Nao foi possivel carregar os dados deste lote" />
        <div className="rounded-lg border bg-white p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">Erro: {err?.message || "Lote nao encontrado"}</p>
          <Link href="/migration" className="text-blue-600 hover:underline text-sm">
            Voltar para Central de Migracao
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lote: ${batchName}`}
        description={batchDescription}
      />
      <BatchDetailClient
        batch={serializedBatch}
        items={serializedItems}
        itemsPagination={itemsPagination}
        errors={serializedErrors}
        userRole={userRole}
      />
    </div>
  );
}
