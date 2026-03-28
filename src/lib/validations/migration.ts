import { z } from "zod";

// ─── Migration Batch ────────────────────────────────────────────────────────

export const createMigrationBatchSchema = z.object({
  name: z.string().min(1, "Nome do lote e obrigatorio"),
  type: z.enum([
    "FULL_INITIAL_LOAD",
    "MODULE_IMPORT",
    "MASS_UPDATE",
    "REIMPORT",
    "EXPORT",
  ]),
  description: z.string().nullable().optional(),
  sourceErpName: z.string().nullable().optional(),
  expectedTotalAmount: z.coerce.number().min(0).nullable().optional(),
});

export type CreateMigrationBatchInput = z.infer<typeof createMigrationBatchSchema>;

// ─── Column Mapping ─────────────────────────────────────────────────────────

export const columnMappingSchema = z.object({
  entityType: z.enum([
    "CHART_OF_ACCOUNTS", "COST_CENTERS", "SUPPLIERS", "CUSTOMERS",
    "BANK_ACCOUNTS", "PAYMENT_METHODS", "CLASSIFICATION_RULES",
    "VALIDATION_RULES", "STAGING_ENTRIES", "OFFICIAL_ENTRIES",
    "SETTLEMENTS", "RECONCILIATIONS", "INSTALLMENTS", "RECURRING_RULES",
    "INTERNAL_TRANSFERS", "OPENING_BALANCES", "PRODUCTS", "WAREHOUSES",
  ]),
  columnMapping: z.record(z.string(), z.string()),
  transformations: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;

// ─── Migration Mapping (saved presets) ──────────────────────────────────────

export const saveMappingPresetSchema = z.object({
  name: z.string().min(1, "Nome do mapeamento e obrigatorio"),
  sourceErpName: z.string().nullable().optional(),
  entityType: z.enum([
    "CHART_OF_ACCOUNTS", "COST_CENTERS", "SUPPLIERS", "CUSTOMERS",
    "BANK_ACCOUNTS", "PAYMENT_METHODS", "CLASSIFICATION_RULES",
    "VALIDATION_RULES", "STAGING_ENTRIES", "OFFICIAL_ENTRIES",
    "SETTLEMENTS", "RECONCILIATIONS", "INSTALLMENTS", "RECURRING_RULES",
    "INTERNAL_TRANSFERS", "OPENING_BALANCES", "PRODUCTS", "WAREHOUSES",
  ]),
  columnMapping: z.record(z.string(), z.string()),
  transformations: z.record(z.string(), z.unknown()).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export type SaveMappingPresetInput = z.infer<typeof saveMappingPresetSchema>;

// ─── Batch correction ───────────────────────────────────────────────────────

export const correctItemSchema = z.object({
  itemId: z.string().min(1),
  correctedData: z.record(z.string(), z.unknown()),
});

export type CorrectItemInput = z.infer<typeof correctItemSchema>;

// ─── Batch approval ─────────────────────────────────────────────────────────

export const approveBatchSchema = z.object({
  batchId: z.string().min(1),
  checklistConfirmed: z.boolean().refine((v) => v === true, {
    message: "Checklist de aprovacao deve ser confirmado",
  }),
});

export type ApproveBatchInput = z.infer<typeof approveBatchSchema>;
