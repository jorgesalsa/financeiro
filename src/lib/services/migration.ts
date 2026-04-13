import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/utils/audit";
import { MIGRATION_IMPORT_ORDER } from "@/lib/constants/statuses";
import type {
  MigrationBatchStatus,
  MigrationEntityType,
  MigrationItemStatus,
  MigrationSeverity,
} from "@/generated/prisma";

// ─── Batch Status Transitions ───────────────────────────────────────────────

const VALID_BATCH_TRANSITIONS: Record<MigrationBatchStatus, MigrationBatchStatus[]> = {
  DRAFT: ["UPLOADED", "CANCELLED"],
  UPLOADED: ["MAPPED", "VALIDATING", "CANCELLED"],
  MAPPED: ["VALIDATING", "CANCELLED"],
  VALIDATING: ["VALIDATED"],
  VALIDATED: ["REVIEWING", "PENDING_APPROVAL", "CANCELLED"],
  REVIEWING: ["VALIDATED", "PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REVIEWING", "CANCELLED"],
  APPROVED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "COMPLETED_PARTIAL", "FAILED"],
  COMPLETED: ["ROLLED_BACK"],
  COMPLETED_PARTIAL: ["ROLLED_BACK"],
  FAILED: ["APPROVED", "CANCELLED"],
  ROLLED_BACK: [],
  CANCELLED: [],
};

export function assertValidBatchTransition(
  from: MigrationBatchStatus,
  to: MigrationBatchStatus
): void {
  const allowed = VALID_BATCH_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Transicao de lote invalida: ${from} → ${to}. Permitidas: ${(allowed ?? []).join(", ") || "nenhuma"}`
    );
  }
}

// ─── Transition batch status with audit ─────────────────────────────────────

export async function transitionBatchStatus(
  batchId: string,
  tenantId: string,
  newStatus: MigrationBatchStatus,
  userId: string,
  userEmail: string,
  extraData?: Record<string, unknown>
) {
  const batch = await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId },
  });

  assertValidBatchTransition(batch.status, newStatus);

  const updated = await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      status: newStatus,
      ...(newStatus === "APPROVED" ? { approvedById: userId, approvedAt: new Date() } : {}),
      ...(newStatus === "PROCESSING" ? { processedAt: new Date() } : {}),
      ...(newStatus === "COMPLETED" || newStatus === "COMPLETED_PARTIAL"
        ? { completedAt: new Date() }
        : {}),
      ...extraData,
    },
  });

  await createAuditLog({
    tenantId,
    tableName: "MigrationBatch",
    recordId: batchId,
    action: "UPDATE",
    oldValues: { status: batch.status },
    newValues: { status: newStatus },
    userId,
    userEmail,
  });

  return updated;
}

// ─── Detect sheets/entities from parsed data ────────────────────────────────

const SHEET_NAME_TO_ENTITY: Record<string, MigrationEntityType> = {
  plano_de_contas: "CHART_OF_ACCOUNTS",
  centros_de_custo: "COST_CENTERS",
  fornecedores: "SUPPLIERS",
  clientes: "CUSTOMERS",
  bancos_contas: "BANK_ACCOUNTS",
  formas_pagamento: "PAYMENT_METHODS",
  regras_classificacao: "CLASSIFICATION_RULES",
  regras_validacao: "VALIDATION_RULES",
  contas_a_pagar: "STAGING_ENTRIES",
  contas_a_receber: "STAGING_ENTRIES",
  lancamentos: "STAGING_ENTRIES",
  lancamentos_staging: "STAGING_ENTRIES",
  lancamentos_oficiais: "OFFICIAL_ENTRIES",
  baixas_liquidacoes: "SETTLEMENTS",
  parcelas: "INSTALLMENTS",
  recorrencias: "RECURRING_RULES",
  transferencias: "INTERNAL_TRANSFERS",
  saldos_iniciais: "OPENING_BALANCES",
  conciliacoes: "RECONCILIATIONS",
  produtos: "PRODUCTS",
  depositos: "WAREHOUSES",
};

export function detectEntityType(sheetName: string): MigrationEntityType | null {
  const normalized = sheetName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_");
  return SHEET_NAME_TO_ENTITY[normalized] ?? null;
}

// ─── Parse uploaded file data ───────────────────────────────────────────────

export interface ParsedSheet {
  sheetName: string;
  entityType: MigrationEntityType;
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 * Creates MigrationItems from parsed sheet data.
 * Called after file upload and sheet detection.
 */
export async function createItemsFromParsedData(
  batchId: string,
  sheets: ParsedSheet[]
): Promise<{ totalRows: number; entityCounts: Record<string, number> }> {
  let totalRows = 0;
  const entityCounts: Record<string, number> = {};

  for (const sheet of sheets) {
    const items = sheet.rows.map((row, index) => ({
      batchId,
      entityType: sheet.entityType,
      rowNumber: index + 1,
      sheetName: sheet.sheetName,
      rawData: row as any,
      externalId: (row as any).external_id || (row as any).externalId || null,
    }));

    if (items.length > 0) {
      await prisma.migrationItem.createMany({ data: items });
    }

    totalRows += items.length;
    entityCounts[sheet.entityType] = items.length;
  }

  // Update batch counters
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: { totalRows },
  });

  // Create entity summaries
  for (const [entityType, count] of Object.entries(entityCounts)) {
    await prisma.migrationEntitySummary.upsert({
      where: { batchId_entityType: { batchId, entityType: entityType as MigrationEntityType } },
      create: {
        batchId,
        entityType: entityType as MigrationEntityType,
        totalRows: count,
      },
      update: { totalRows: count },
    });
  }

  return { totalRows, entityCounts };
}

// ─── Apply column mapping ───────────────────────────────────────────────────

export async function applyColumnMapping(
  batchId: string,
  mappingConfig: Record<string, Record<string, string>>,
  transformations?: Record<string, Record<string, Record<string, string>>>
) {
  // For each entity type in the mapping config, update items
  for (const [entityType, colMap] of Object.entries(mappingConfig)) {
    const items = await prisma.migrationItem.findMany({
      where: { batchId, entityType: entityType as MigrationEntityType },
    });

    for (const item of items) {
      const raw = item.rawData as Record<string, unknown>;
      const mapped: Record<string, unknown> = {};

      for (const [sourceCol, targetField] of Object.entries(colMap)) {
        if (targetField && raw[sourceCol] !== undefined) {
          let value = raw[sourceCol];

          // Apply value transformations if any
          const entityTransforms = transformations?.[entityType]?.[targetField];
          if (entityTransforms && typeof value === "string" && entityTransforms[value]) {
            value = entityTransforms[value];
          }

          mapped[targetField] = value;
        }
      }

      // Preserve _action field
      if (raw._action) mapped._action = raw._action;
      if (raw.external_id) mapped.external_id = raw.external_id;

      await prisma.migrationItem.update({
        where: { id: item.id },
        data: { mappedData: mapped as any },
      });
    }
  }

  // Save mapping config on batch
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: { mappingConfig: mappingConfig as any },
  });
}

// ─── Validation Engine ──────────────────────────────────────────────────────

interface ValidationError {
  itemId: string;
  severity: MigrationSeverity;
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Validates all items in a batch. Returns errors found.
 */
export async function validateBatch(
  batchId: string,
  tenantId: string
): Promise<{ errors: number; warnings: number; valid: number }> {
  const items = await prisma.migrationItem.findMany({
    where: { batchId },
    orderBy: [{ entityType: "asc" }, { rowNumber: "asc" }],
  });

  const allErrors: ValidationError[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  // Clear previous errors
  await prisma.migrationError.deleteMany({ where: { batchId } });

  for (const item of items) {
    const data = (item.correctedData ?? item.mappedData ?? item.rawData) as Record<string, unknown>;
    const itemErrors: ValidationError[] = [];

    // ── E001: Required field check ────────────────────────────────────
    const requiredFields = getRequiredFields(item.entityType);
    for (const field of requiredFields) {
      const val = data[field];
      if (val === undefined || val === null || val === "") {
        itemErrors.push({
          itemId: item.id,
          severity: "ERROR",
          field,
          code: "E001",
          message: `Campo obrigatorio '${field}' vazio`,
        });
      }
    }

    // ── E003: Negative amounts ────────────────────────────────────────
    if (data.amount !== undefined && Number(data.amount) < 0) {
      itemErrors.push({
        itemId: item.id,
        severity: "ERROR",
        field: "amount",
        code: "E003",
        message: "Valor negativo nao permitido",
      });
    }

    // ── E005: CNPJ/CPF validation ─────────────────────────────────────
    if (
      (item.entityType === "SUPPLIERS" || item.entityType === "CUSTOMERS") &&
      data.cnpj_cpf
    ) {
      const cleaned = String(data.cnpj_cpf).replace(/\D/g, "");
      if (cleaned.length !== 11 && cleaned.length !== 14) {
        itemErrors.push({
          itemId: item.id,
          severity: "ERROR",
          field: "cnpj_cpf",
          code: "E005",
          message: `CNPJ/CPF invalido (${cleaned.length} digitos, esperado 11 ou 14)`,
        });
      }
    }

    // ── E021: Enum validation ─────────────────────────────────────────
    const enumFields = getEnumFields(item.entityType);
    for (const { field, values } of enumFields) {
      if (data[field] && !values.includes(String(data[field]).toUpperCase())) {
        itemErrors.push({
          itemId: item.id,
          severity: "ERROR",
          field,
          code: "E021",
          message: `Valor '${data[field]}' invalido. Opcoes: ${values.join(", ")}`,
        });
      }
    }

    // ── W002: High value warning ──────────────────────────────────────
    if (data.amount !== undefined && Number(data.amount) > 1000000) {
      itemErrors.push({
        itemId: item.id,
        severity: "WARNING",
        field: "amount",
        code: "W002",
        message: "Valor muito alto (> R$ 1.000.000)",
      });
    }

    // ── W009: Entry without chart of account ──────────────────────────
    if (
      (item.entityType === "STAGING_ENTRIES" || item.entityType === "OFFICIAL_ENTRIES") &&
      !data.chart_of_account_code
    ) {
      itemErrors.push({
        itemId: item.id,
        severity: "WARNING",
        field: "chart_of_account_code",
        code: "W009",
        message: "Lancamento sem categoria atribuida",
      });
    }

    // Calculate score
    let score = 100;
    const hasErrors = itemErrors.some((e) => e.severity === "ERROR");
    const hasWarnings = itemErrors.some((e) => e.severity === "WARNING");
    const warningsForItem = itemErrors.filter((e) => e.severity === "WARNING").length;

    if (hasErrors) score = 0;
    else {
      score -= warningsForItem * 10;
      if (!data.external_id) score -= 5;
      score = Math.max(0, Math.min(100, score));
    }

    // Determine status
    let newStatus: MigrationItemStatus;
    if (hasErrors) {
      newStatus = "ERROR";
      errorCount++;
    } else if (hasWarnings) {
      newStatus = "WARNING";
      warningCount++;
    } else {
      newStatus = "VALID";
      validCount++;
    }

    await prisma.migrationItem.update({
      where: { id: item.id },
      data: {
        status: newStatus,
        confidenceScore: score,
        validatedAt: new Date(),
      },
    });

    allErrors.push(...itemErrors);
  }

  // Bulk insert errors
  if (allErrors.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allErrors.length; i += CHUNK_SIZE) {
      const chunk = allErrors.slice(i, i + CHUNK_SIZE);
      await prisma.migrationError.createMany({
        data: chunk.map((err) => ({
          batchId,
          itemId: err.itemId,
          severity: err.severity,
          field: err.field,
          code: err.code,
          message: err.message,
          suggestion: err.suggestion,
        })),
      });
    }
  }

  // Update batch counters
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      validationReport: {
        totalItems: items.length,
        valid: validCount,
        warnings: warningCount,
        errors: errorCount,
        validatedAt: new Date().toISOString(),
      } as any,
    },
  });

  // Update entity summaries
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.entityType]) acc[item.entityType] = { valid: 0, error: 0, warning: 0 };
      const data = allErrors.filter((e) => e.itemId === item.id);
      if (data.some((e) => e.severity === "ERROR")) acc[item.entityType].error++;
      else if (data.some((e) => e.severity === "WARNING")) acc[item.entityType].warning++;
      else acc[item.entityType].valid++;
      return acc;
    },
    {} as Record<string, { valid: number; error: number; warning: number }>
  );

  for (const [entityType, counts] of Object.entries(grouped)) {
    await prisma.migrationEntitySummary.upsert({
      where: {
        batchId_entityType: { batchId, entityType: entityType as MigrationEntityType },
      },
      create: {
        batchId,
        entityType: entityType as MigrationEntityType,
        validRows: counts.valid,
        errorRows: counts.error,
        warningRows: counts.warning,
      },
      update: {
        validRows: counts.valid,
        errorRows: counts.error,
        warningRows: counts.warning,
      },
    });
  }

  return { errors: errorCount, warnings: warningCount, valid: validCount };
}

// ─── Import (Write to destination tables) ───────────────────────────────────

export async function processBatch(
  batchId: string,
  tenantId: string,
  userId: string,
  userEmail: string
): Promise<{ imported: number; failed: number }> {
  let importedCount = 0;
  let failedCount = 0;
  const rollbackData: Record<string, string[]> = {};

  // Process entities in topological order
  for (const entityType of MIGRATION_IMPORT_ORDER) {
    const items = await prisma.migrationItem.findMany({
      where: {
        batchId,
        entityType,
        status: { in: ["VALID", "WARNING"] },
      },
      orderBy: { rowNumber: "asc" },
    });

    if (items.length === 0) continue;

    const entityRollbackIds: string[] = [];

    for (const item of items) {
      const data = (item.correctedData ?? item.mappedData ?? item.rawData) as Record<string, unknown>;
      const action = (data._action as string)?.toUpperCase() || "CREATE";

      if (action === "SKIP") {
        await prisma.migrationItem.update({
          where: { id: item.id },
          data: { status: "SKIPPED" },
        });
        continue;
      }

      try {
        const resultId = await importSingleItem(entityType, data, tenantId, userId, action, item.sheetName ?? undefined);
        if (resultId) {
          entityRollbackIds.push(resultId);
          await prisma.migrationItem.update({
            where: { id: item.id },
            data: {
              status: "IMPORTED",
              resultId,
              resultType: entityTypeToTable(entityType),
              importedAt: new Date(),
            },
          });
          importedCount++;
        }
      } catch (err: any) {
        await prisma.migrationItem.update({
          where: { id: item.id },
          data: { status: "FAILED" },
        });
        await prisma.migrationError.create({
          data: {
            batchId,
            itemId: item.id,
            severity: "ERROR",
            code: "IMPORT_FAILED",
            message: err.message || "Erro ao importar registro",
          },
        });
        failedCount++;
      }
    }

    if (entityRollbackIds.length > 0) {
      rollbackData[entityType] = entityRollbackIds;
    }
  }

  // Save rollback data on batch
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      importedRows: importedCount,
      rollbackData: rollbackData as any,
    },
  });

  return { imported: importedCount, failed: failedCount };
}

// ─── Import single item into target table ───────────────────────────────────

async function importSingleItem(
  entityType: MigrationEntityType,
  data: Record<string, unknown>,
  tenantId: string,
  userId: string,
  action: string,
  sheetName?: string
): Promise<string | null> {
  switch (entityType) {
    case "CHART_OF_ACCOUNTS":
      return importChartOfAccount(data, tenantId, action);
    case "COST_CENTERS":
      return importCostCenter(data, tenantId, action);
    case "SUPPLIERS":
      return importSupplier(data, tenantId, action);
    case "CUSTOMERS":
      return importCustomer(data, tenantId, action);
    case "BANK_ACCOUNTS":
      return importBankAccount(data, tenantId, action);
    case "PAYMENT_METHODS":
      return importPaymentMethod(data, tenantId, action);
    case "STAGING_ENTRIES":
      return importStagingEntry(data, tenantId, userId, action, sheetName);
    default:
      // Other entity types to be implemented in future phases
      return null;
  }
}

async function importChartOfAccount(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const code = String(data.code);
  const name = String(data.name);
  const type = String(data.type).toUpperCase() as any;
  const level = Number(data.level) || 1;
  const isAnalytic = parseBool(data.is_analytic, true);
  const active = parseBool(data.active, true);

  // Resolve parent
  let parentId: string | null = null;
  if (data.parent_code) {
    const parent = await prisma.chartOfAccount.findFirst({
      where: { tenantId, code: String(data.parent_code) },
    });
    if (parent) parentId = parent.id;
  }

  if (action === "UPDATE") {
    const existing = await prisma.chartOfAccount.findFirst({
      where: { tenantId, code },
    });
    if (existing) {
      await prisma.chartOfAccount.update({
        where: { id: existing.id },
        data: { name, type, level, parentId, isAnalytic, active },
      });
      return existing.id;
    }
  }

  const created = await prisma.chartOfAccount.create({
    data: { tenantId, code, name, type, level, parentId, isAnalytic, active },
  });
  return created.id;
}

async function importCostCenter(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const code = String(data.code);
  const name = String(data.name);
  const active = parseBool(data.active, true);

  let parentId: string | null = null;
  if (data.parent_code) {
    const parent = await prisma.costCenter.findFirst({
      where: { tenantId, code: String(data.parent_code) },
    });
    if (parent) parentId = parent.id;
  }

  if (action === "UPDATE") {
    const existing = await prisma.costCenter.findFirst({
      where: { tenantId, code },
    });
    if (existing) {
      await prisma.costCenter.update({
        where: { id: existing.id },
        data: { name, parentId, active },
      });
      return existing.id;
    }
  }

  const created = await prisma.costCenter.create({
    data: { tenantId, code, name, parentId, active },
  });
  return created.id;
}

async function importSupplier(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const cnpjCpf = String(data.cnpj_cpf).replace(/\D/g, "");

  if (action === "UPDATE") {
    const existing = await prisma.supplier.findFirst({
      where: { tenantId, cnpjCpf },
    });
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          ...(data.name ? { name: String(data.name) } : {}),
          ...(data.trade_name ? { tradeName: String(data.trade_name) } : {}),
          ...(data.email ? { email: String(data.email) } : {}),
          ...(data.phone ? { phone: String(data.phone) } : {}),
          ...(data.address ? { address: String(data.address) } : {}),
          ...(data.city ? { city: String(data.city) } : {}),
          ...(data.state ? { state: String(data.state) } : {}),
          ...(data.zip_code ? { zipCode: String(data.zip_code) } : {}),
          ...(data.notes ? { notes: String(data.notes) } : {}),
          ...(data.active !== undefined ? { active: parseBool(data.active, true) } : {}),
        },
      });
      return existing.id;
    }
  }

  const created = await prisma.supplier.create({
    data: {
      tenantId,
      name: String(data.name),
      tradeName: data.trade_name ? String(data.trade_name) : null,
      cnpjCpf,
      stateRegistration: data.state_registration ? String(data.state_registration) : null,
      email: data.email ? String(data.email) : null,
      phone: data.phone ? String(data.phone) : null,
      address: data.address ? String(data.address) : null,
      city: data.city ? String(data.city) : null,
      state: data.state ? String(data.state) : null,
      zipCode: data.zip_code ? String(data.zip_code) : null,
      notes: data.notes ? String(data.notes) : null,
      active: parseBool(data.active, true),
    },
  });
  return created.id;
}

async function importCustomer(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const cnpjCpf = String(data.cnpj_cpf).replace(/\D/g, "");

  if (action === "UPDATE") {
    const existing = await prisma.customer.findFirst({
      where: { tenantId, cnpjCpf },
    });
    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(data.name ? { name: String(data.name) } : {}),
          ...(data.trade_name ? { tradeName: String(data.trade_name) } : {}),
          ...(data.email ? { email: String(data.email) } : {}),
          ...(data.phone ? { phone: String(data.phone) } : {}),
          ...(data.address ? { address: String(data.address) } : {}),
          ...(data.city ? { city: String(data.city) } : {}),
          ...(data.state ? { state: String(data.state) } : {}),
          ...(data.zip_code ? { zipCode: String(data.zip_code) } : {}),
          ...(data.notes ? { notes: String(data.notes) } : {}),
          ...(data.active !== undefined ? { active: parseBool(data.active, true) } : {}),
        },
      });
      return existing.id;
    }
  }

  const created = await prisma.customer.create({
    data: {
      tenantId,
      name: String(data.name),
      tradeName: data.trade_name ? String(data.trade_name) : null,
      cnpjCpf,
      stateRegistration: data.state_registration ? String(data.state_registration) : null,
      email: data.email ? String(data.email) : null,
      phone: data.phone ? String(data.phone) : null,
      address: data.address ? String(data.address) : null,
      city: data.city ? String(data.city) : null,
      state: data.state ? String(data.state) : null,
      zipCode: data.zip_code ? String(data.zip_code) : null,
      notes: data.notes ? String(data.notes) : null,
      active: parseBool(data.active, true),
    },
  });
  return created.id;
}

async function importBankAccount(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const bankCode = String(data.bank_code);
  const agency = String(data.agency);
  const accountNumber = String(data.account_number);

  if (action === "UPDATE") {
    const existing = await prisma.bankAccount.findFirst({
      where: { tenantId, bankCode, agency, accountNumber },
    });
    if (existing) {
      await prisma.bankAccount.update({
        where: { id: existing.id },
        data: {
          ...(data.bank_name ? { bankName: String(data.bank_name) } : {}),
          ...(data.account_type ? { accountType: String(data.account_type).toUpperCase() as any } : {}),
          ...(data.active !== undefined ? { active: parseBool(data.active, true) } : {}),
        },
      });
      return existing.id;
    }
  }

  const created = await prisma.bankAccount.create({
    data: {
      tenantId,
      bankName: String(data.bank_name),
      bankCode,
      agency,
      accountNumber,
      accountType: (String(data.account_type || "CHECKING").toUpperCase()) as any,
      initialBalance: Number(data.initial_balance) || 0,
      currentBalance: Number(data.initial_balance) || 0,
      active: parseBool(data.active, true),
    },
  });
  return created.id;
}

async function importPaymentMethod(
  data: Record<string, unknown>,
  tenantId: string,
  action: string
): Promise<string> {
  const name = String(data.name);

  if (action === "UPDATE") {
    const existing = await prisma.paymentMethod.findFirst({
      where: { tenantId, name },
    });
    if (existing) {
      await prisma.paymentMethod.update({
        where: { id: existing.id },
        data: {
          ...(data.type ? { type: String(data.type).toUpperCase() as any } : {}),
          ...(data.days_to_settle !== undefined ? { daysToSettle: Number(data.days_to_settle) } : {}),
          ...(data.fee_percentage !== undefined ? { feePercentage: Number(data.fee_percentage) } : {}),
          ...(data.active !== undefined ? { active: parseBool(data.active, true) } : {}),
        },
      });
      return existing.id;
    }
  }

  const created = await prisma.paymentMethod.create({
    data: {
      tenantId,
      name,
      type: (String(data.type || "OTHER").toUpperCase()) as any,
      daysToSettle: Number(data.days_to_settle) || 0,
      feePercentage: Number(data.fee_percentage) || 0,
      active: parseBool(data.active, true),
    },
  });
  return created.id;
}

async function importStagingEntry(
  data: Record<string, unknown>,
  tenantId: string,
  userId: string,
  action: string,
  itemSheetName?: string
): Promise<string> {
  // Infer type/category from sheet name if not explicit
  const sheetName = (itemSheetName ?? String(data._sheetName ?? data.sheetName ?? "")).toLowerCase();
  const isPayable = sheetName.includes("pagar");
  const isReceivable = sheetName.includes("receber");

  const type: "DEBIT" | "CREDIT" = data.type
    ? (String(data.type).toUpperCase() as any)
    : isPayable
    ? "DEBIT"
    : isReceivable
    ? "CREDIT"
    : "DEBIT";

  const category: string = data.category
    ? String(data.category).toUpperCase()
    : isPayable
    ? "PAYABLE"
    : isReceivable
    ? "RECEIVABLE"
    : "PAYABLE";

  const movementType: string = data.movement_type
    ? String(data.movement_type).toUpperCase()
    : isPayable
    ? "EXIT"
    : isReceivable
    ? "ENTRY"
    : "EXIT";

  // Resolve related entities by code/cnpj
  let chartOfAccountId: string | null = null;
  if (data.chart_of_account_code) {
    const account = await prisma.chartOfAccount.findFirst({
      where: { tenantId, code: String(data.chart_of_account_code) },
    });
    if (account) chartOfAccountId = account.id;
  }

  let costCenterId: string | null = null;
  if (data.cost_center_code) {
    const cc = await prisma.costCenter.findFirst({
      where: { tenantId, code: String(data.cost_center_code) },
    });
    if (cc) costCenterId = cc.id;
  }

  let supplierId: string | null = null;
  const supplierCnpj = data.supplier_cnpj_cpf || data.supplier_cnpj;
  if (supplierCnpj) {
    const supplier = await prisma.supplier.findFirst({
      where: { tenantId, cnpjCpf: String(supplierCnpj) },
    });
    if (supplier) supplierId = supplier.id;
  }

  let customerId: string | null = null;
  const customerCnpj = data.customer_cnpj_cpf || data.customer_cnpj;
  if (customerCnpj) {
    const customer = await prisma.customer.findFirst({
      where: { tenantId, cnpjCpf: String(customerCnpj) },
    });
    if (customer) customerId = customer.id;
  }

  let bankAccountId: string | null = null;
  if (data.bank_code && data.agency && data.account_number) {
    const bank = await prisma.bankAccount.findFirst({
      where: {
        tenantId,
        bankCode: String(data.bank_code),
        agency: String(data.agency),
        accountNumber: String(data.account_number),
      },
    });
    if (bank) bankAccountId = bank.id;
  }

  let paymentMethodId: string | null = null;
  if (data.payment_method) {
    const pm = await prisma.paymentMethod.findFirst({
      where: { tenantId, name: String(data.payment_method) },
    });
    if (pm) paymentMethodId = pm.id;
  }

  const created = await prisma.stagingEntry.create({
    data: {
      tenantId,
      source: "MIGRATION",
      status: "PENDING" as any,
      date: new Date(String(data.date)),
      competenceDate: data.competence_date ? new Date(String(data.competence_date)) : undefined,
      dueDate: data.due_date ? new Date(String(data.due_date)) : undefined,
      description: String(data.description),
      amount: Number(data.amount),
      type,
      category: category as any,
      movementType: movementType as any,
      financialNature: data.financial_nature ? (String(data.financial_nature).toUpperCase() as any) : undefined,
      chartOfAccountId,
      costCenterId,
      supplierId,
      customerId,
      bankAccountId,
      paymentMethodId,
      counterpartName: String(data.supplier_name || data.customer_name || ""),
      counterpartCnpjCpf: String(supplierCnpj || customerCnpj || ""),
      documentNumber: data.document_number ? String(data.document_number) : undefined,
      notes: data.notes ? String(data.notes) : undefined,
      createdById: userId,
    },
  });
  return created.id;
}

// ─── Rollback ───────────────────────────────────────────────────────────────

export async function rollbackBatch(
  batchId: string,
  tenantId: string,
  userId: string,
  userEmail: string
): Promise<{ rolledBack: number }> {
  const batch = await prisma.migrationBatch.findFirstOrThrow({
    where: { id: batchId, tenantId },
  });

  if (!batch.rollbackData) {
    throw new Error("Nenhum dado de rollback disponivel para este lote");
  }

  const rollbackData = batch.rollbackData as Record<string, string[]>;
  let rolledBackCount = 0;

  // Rollback in reverse import order
  const reverseOrder = [...MIGRATION_IMPORT_ORDER].reverse();

  for (const entityType of reverseOrder) {
    const ids = rollbackData[entityType];
    if (!ids || ids.length === 0) continue;

    const table = entityTypeToTable(entityType);
    if (!table) continue;

    // Delete created records — using raw deleteMany for simplicity
    for (const id of ids) {
      try {
        await (prisma as any)[table].delete({ where: { id } });
        rolledBackCount++;
      } catch {
        // Record may have been referenced, skip
      }
    }
  }

  // Update items to ROLLED_BACK
  await prisma.migrationItem.updateMany({
    where: { batchId, status: "IMPORTED" },
    data: { status: "ROLLED_BACK" },
  });

  // Update batch
  await transitionBatchStatus(batchId, tenantId, "ROLLED_BACK", userId, userEmail, {
    rollbackAt: new Date(),
    rollbackById: userId,
  });

  return { rolledBack: rolledBackCount };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRequiredFields(entityType: MigrationEntityType): string[] {
  switch (entityType) {
    case "CHART_OF_ACCOUNTS":
      return ["code", "name", "type"];
    case "COST_CENTERS":
      return ["code", "name"];
    case "SUPPLIERS":
    case "CUSTOMERS":
      return ["name", "cnpj_cpf"];
    case "BANK_ACCOUNTS":
      return ["bank_name", "bank_code", "agency", "account_number"];
    case "PAYMENT_METHODS":
      return ["name", "type"];
    case "STAGING_ENTRIES":
      return [
        "date",
        "competence_date",
        "due_date",
        "description",
        "amount",
        "financial_nature",
        "chart_of_account_code",
        "bank_code",
        "agency",
        "account_number",
        "payment_method",
        "document_number",
      ];
    case "OFFICIAL_ENTRIES":
      return ["date", "description", "amount", "type"];
    case "SETTLEMENTS":
      return ["entry_external_id", "date", "amount"];
    case "INTERNAL_TRANSFERS":
      return ["source_bank_code", "source_agency", "source_account", "target_bank_code", "target_agency", "target_account", "amount", "transfer_date"];
    default:
      return [];
  }
}

interface EnumFieldDef {
  field: string;
  values: string[];
}

function getEnumFields(entityType: MigrationEntityType): EnumFieldDef[] {
  switch (entityType) {
    case "CHART_OF_ACCOUNTS":
      return [{ field: "type", values: ["REVENUE", "DEDUCTION", "COST", "EXPENSE", "INVESTMENT"] }];
    case "BANK_ACCOUNTS":
      return [{ field: "account_type", values: ["CHECKING", "SAVINGS", "INVESTMENT"] }];
    case "PAYMENT_METHODS":
      return [{ field: "type", values: ["CASH", "BANK_TRANSFER", "PIX", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "CHECK", "OTHER"] }];
    case "STAGING_ENTRIES":
      return [
        { field: "financial_nature", values: ["OPERATIONAL", "NON_OPERATIONAL", "FINANCIAL", "PATRIMONIAL"] },
      ];
    case "OFFICIAL_ENTRIES":
      return [
        { field: "type", values: ["CREDIT", "DEBIT", "C", "D"] },
        { field: "category", values: ["PAYABLE", "RECEIVABLE", "TRANSFER", "ADJUSTMENT"] },
        { field: "movement_type", values: ["ENTRY", "EXIT", "TRANSFER", "ADJUSTMENT"] },
        { field: "financial_nature", values: ["OPERATIONAL", "NON_OPERATIONAL", "FINANCIAL", "PATRIMONIAL"] },
      ];
    default:
      return [];
  }
}

function entityTypeToTable(entityType: MigrationEntityType): string | null {
  const map: Record<MigrationEntityType, string> = {
    CHART_OF_ACCOUNTS: "chartOfAccount",
    COST_CENTERS: "costCenter",
    SUPPLIERS: "supplier",
    CUSTOMERS: "customer",
    BANK_ACCOUNTS: "bankAccount",
    PAYMENT_METHODS: "paymentMethod",
    CLASSIFICATION_RULES: "classificationRule",
    VALIDATION_RULES: "validationRule",
    STAGING_ENTRIES: "stagingEntry",
    OFFICIAL_ENTRIES: "officialEntry",
    SETTLEMENTS: "settlement",
    RECONCILIATIONS: "reconciliation",
    INSTALLMENTS: "officialEntry",
    RECURRING_RULES: "recurringRule",
    INTERNAL_TRANSFERS: "internalTransfer",
    OPENING_BALANCES: "bankAccount",
    PRODUCTS: "product",
    WAREHOUSES: "warehouse",
  };
  return map[entityType] ?? null;
}

function parseBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase().trim();
  return ["sim", "yes", "true", "1", "s", "y"].includes(str);
}
