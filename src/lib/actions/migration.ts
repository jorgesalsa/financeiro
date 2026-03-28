"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createMigrationBatchSchema } from "@/lib/validations/migration";
import {
  transitionBatchStatus,
  createItemsFromParsedData,
  applyColumnMapping,
  validateBatch,
  processBatch,
  rollbackBatch,
  detectEntityType,
  type ParsedSheet,
} from "@/lib/services/migration";
import type { MigrationBatchType, MigrationEntityType } from "@/generated/prisma";
import { createAuditLog } from "@/lib/utils/audit";

// ─── List Batches ───────────────────────────────────────────────────────────

export async function listMigrationBatches() {
  const user = await getCurrentUser();
  return prisma.migrationBatch.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      _count: { select: { items: true, errors: true } },
    },
    take: 50,
  });
}

// ─── Get Batch Detail ───────────────────────────────────────────────────────

export async function getMigrationBatch(batchId: string) {
  const user = await getCurrentUser();
  return prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      entitySummaries: { orderBy: { entityType: "asc" } },
      _count: { select: { items: true, errors: true } },
    },
  });
}

// ─── Get Batch Items ────────────────────────────────────────────────────────

export async function getMigrationItems(
  batchId: string,
  opts?: {
    entityType?: MigrationEntityType;
    status?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const user = await getCurrentUser();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;

  // Verify batch belongs to tenant
  await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  const where: any = { batchId };
  if (opts?.entityType) where.entityType = opts.entityType;
  if (opts?.status) where.status = opts.status;

  const [items, total] = await Promise.all([
    prisma.migrationItem.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { rowNumber: "asc" }],
      include: {
        errors: { orderBy: { severity: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.migrationItem.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Get Batch Errors ───────────────────────────────────────────────────────

export async function getMigrationErrors(
  batchId: string,
  severity?: string
) {
  const user = await getCurrentUser();
  await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  const where: any = { batchId };
  if (severity) where.severity = severity;

  return prisma.migrationError.findMany({
    where,
    orderBy: [{ severity: "asc" }, { code: "asc" }],
    include: {
      item: { select: { rowNumber: true, entityType: true, sheetName: true } },
    },
    take: 200,
  });
}

// ─── Create Batch ───────────────────────────────────────────────────────────

export async function createMigrationBatch(data: {
  name: string;
  type: string;
  description?: string;
  sourceErpName?: string;
  expectedTotalAmount?: number;
}) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);
  const validated = createMigrationBatchSchema.parse(data);

  const batch = await prisma.migrationBatch.create({
    data: {
      tenantId: user.tenantId,
      name: validated.name,
      type: validated.type as MigrationBatchType,
      description: validated.description ?? null,
      sourceErpName: validated.sourceErpName ?? null,
      expectedTotalAmount: validated.expectedTotalAmount ?? null,
      createdById: user.id,
    },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "MigrationBatch",
    recordId: batch.id,
    action: "CREATE",
    newValues: { name: batch.name, type: batch.type },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/migration");
  return batch;
}

// ─── Upload & Parse File ────────────────────────────────────────────────────

export async function uploadMigrationFile(
  batchId: string,
  sheetsData: { sheetName: string; headers: string[]; rows: Record<string, unknown>[] }[],
  fileInfo: { fileName: string; fileSize: number; fileHash: string }
) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  // Verify batch
  const batch = await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  // Detect entity types for each sheet
  const parsedSheets: ParsedSheet[] = [];
  for (const sheet of sheetsData) {
    const entityType = detectEntityType(sheet.sheetName);
    if (entityType) {
      parsedSheets.push({
        sheetName: sheet.sheetName,
        entityType,
        headers: sheet.headers,
        rows: sheet.rows,
      });
    }
  }

  if (parsedSheets.length === 0) {
    throw new Error(
      "Nenhuma aba reconhecida no arquivo. Verifique os nomes das abas."
    );
  }

  // Create items
  const result = await createItemsFromParsedData(batchId, parsedSheets);

  // Update batch with file info
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      fileHash: fileInfo.fileHash,
      status: "UPLOADED",
    },
  });

  revalidatePath("/migration");
  return {
    totalRows: result.totalRows,
    entityCounts: result.entityCounts,
    sheets: parsedSheets.map((s) => s.entityType),
  };
}

// ─── Map Columns ────────────────────────────────────────────────────────────

export async function mapBatchColumns(
  batchId: string,
  mappingConfig: Record<string, Record<string, string>>,
  transformations?: Record<string, Record<string, Record<string, string>>>
) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  await applyColumnMapping(batchId, mappingConfig, transformations);

  await transitionBatchStatus(batchId, user.tenantId, "MAPPED", user.id, user.email);

  revalidatePath("/migration");
  return { success: true };
}

// ─── Validate Batch ─────────────────────────────────────────────────────────

export async function validateMigrationBatch(batchId: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  const batch = await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  await transitionBatchStatus(batchId, user.tenantId, "VALIDATING", user.id, user.email);

  const result = await validateBatch(batchId, user.tenantId);

  await transitionBatchStatus(batchId, user.tenantId, "VALIDATED", user.id, user.email);

  revalidatePath("/migration");
  return result;
}

// ─── Correct Item ───────────────────────────────────────────────────────────

export async function correctMigrationItem(
  batchId: string,
  itemId: string,
  correctedData: Record<string, unknown>
) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  await prisma.migrationItem.update({
    where: { id: itemId },
    data: { correctedData: correctedData as any },
  });

  // Resolve associated errors
  await prisma.migrationError.updateMany({
    where: { itemId, resolved: false },
    data: { resolved: true, resolvedAt: new Date() },
  });

  revalidatePath("/migration");
  return { success: true };
}

// ─── Skip Item ──────────────────────────────────────────────────────────────

export async function skipMigrationItem(batchId: string, itemId: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  await prisma.migrationItem.update({
    where: { id: itemId },
    data: { status: "SKIPPED" },
  });

  // Update batch counter
  const skippedCount = await prisma.migrationItem.count({
    where: { batchId, status: "SKIPPED" },
  });
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: { skippedRows: skippedCount },
  });

  revalidatePath("/migration");
  return { success: true };
}

// ─── Approve Batch ──────────────────────────────────────────────────────────

export async function approveMigrationBatch(batchId: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  const batch = await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId },
  });

  // Check no unresolved blocking errors
  const unresolvedErrors = await prisma.migrationError.count({
    where: { batchId, severity: "ERROR", resolved: false },
  });

  if (unresolvedErrors > 0) {
    throw new Error(
      `Existem ${unresolvedErrors} erros bloqueantes nao resolvidos. Resolva-os antes de aprovar.`
    );
  }

  await transitionBatchStatus(batchId, user.tenantId, "PENDING_APPROVAL", user.id, user.email);
  await transitionBatchStatus(batchId, user.tenantId, "APPROVED", user.id, user.email);

  revalidatePath("/migration");
  return { success: true };
}

// ─── Process (Import) Batch ─────────────────────────────────────────────────

export async function processMigrationBatch(batchId: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  await transitionBatchStatus(batchId, user.tenantId, "PROCESSING", user.id, user.email);

  try {
    const result = await processBatch(batchId, user.tenantId, user.id, user.email);

    const newStatus = result.failed > 0 ? "COMPLETED_PARTIAL" : "COMPLETED";
    await transitionBatchStatus(batchId, user.tenantId, newStatus as any, user.id, user.email);

    revalidatePath("/migration");
    return result;
  } catch (err: any) {
    await transitionBatchStatus(batchId, user.tenantId, "FAILED", user.id, user.email);
    throw err;
  }
}

// ─── Rollback Batch ─────────────────────────────────────────────────────────

export async function rollbackMigrationBatch(batchId: string) {
  const user = await requireRole(["ADMIN"]);

  const result = await rollbackBatch(batchId, user.tenantId, user.id, user.email);

  revalidatePath("/migration");
  return result;
}

// ─── Cancel Batch ───────────────────────────────────────────────────────────

export async function cancelMigrationBatch(batchId: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER", "ANALYST"]);

  await transitionBatchStatus(batchId, user.tenantId, "CANCELLED", user.id, user.email);

  revalidatePath("/migration");
  return { success: true };
}

// ─── Save Mapping Preset ────────────────────────────────────────────────────

export async function saveMappingPreset(data: {
  name: string;
  sourceErpName?: string;
  entityType: string;
  columnMapping: Record<string, string>;
  transformations?: Record<string, unknown>;
  isDefault?: boolean;
}) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  const mapping = await prisma.migrationMapping.create({
    data: {
      tenantId: user.tenantId,
      name: data.name,
      sourceErpName: data.sourceErpName ?? null,
      entityType: data.entityType as MigrationEntityType,
      columnMapping: data.columnMapping as any,
      transformations: data.transformations as any ?? null,
      isDefault: data.isDefault ?? false,
      createdById: user.id,
    },
  });

  revalidatePath("/migration");
  return mapping;
}

// ─── List Mapping Presets ───────────────────────────────────────────────────

export async function listMappingPresets(entityType?: string) {
  const user = await getCurrentUser();

  const where: any = { tenantId: user.tenantId };
  if (entityType) where.entityType = entityType;

  return prisma.migrationMapping.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { createdBy: { select: { name: true } } },
  });
}

// ─── Stats for Overview ─────────────────────────────────────────────────────

export async function getMigrationStats() {
  const user = await getCurrentUser();

  const [total, inProgress, pendingApproval, completed, failed] = await Promise.all([
    prisma.migrationBatch.count({
      where: { tenantId: user.tenantId },
    }),
    prisma.migrationBatch.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ["UPLOADED", "MAPPED", "VALIDATING", "VALIDATED", "REVIEWING"] },
      },
    }),
    prisma.migrationBatch.count({
      where: { tenantId: user.tenantId, status: "PENDING_APPROVAL" },
    }),
    prisma.migrationBatch.count({
      where: { tenantId: user.tenantId, status: { in: ["COMPLETED", "COMPLETED_PARTIAL"] } },
    }),
    prisma.migrationBatch.count({
      where: { tenantId: user.tenantId, status: "FAILED" },
    }),
  ]);

  return { total, inProgress, pendingApproval, completed, failed };
}
