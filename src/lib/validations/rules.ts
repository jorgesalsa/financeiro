import { z } from "zod";

// RA03: Classification Rule schema (expanded engine)
export const classificationRuleSchema = z.object({
  priority: z.coerce.number().int().min(1, "Prioridade deve ser >= 1"),
  field: z.enum(["CNPJ", "DESCRIPTION", "VALUE_RANGE"]),
  pattern: z.string().min(1, "Padrão é obrigatório"),
  chartOfAccountId: z.string().nullable().optional(),
  costCenterId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  // RA03: Expanded fields
  conditionType: z.enum(["AND", "OR"]).default("AND"),
  actionType: z.enum(["CLASSIFY", "BLOCK", "ALERT", "QUEUE"]).default("CLASSIFY"),
  confidence: z.coerce.number().int().min(0).max(100).default(100),
  description: z.string().nullable().optional(),
  minAmount: z.coerce.number().min(0).nullable().optional(),
  maxAmount: z.coerce.number().min(0).nullable().optional(),
  supplierPattern: z.string().nullable().optional(),
  datePattern: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

// RA06: Internal Transfer schema
export const internalTransferSchema = z.object({
  sourceAccountId: z.string().min(1, "Conta de origem é obrigatória"),
  targetAccountId: z.string().min(1, "Conta de destino é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  transferDate: z.coerce.date(),
  reference: z.string().nullable().optional(),
}).refine(
  (data) => data.sourceAccountId !== data.targetAccountId,
  { message: "Conta de origem e destino devem ser diferentes", path: ["targetAccountId"] }
);

// RA03: Validation Rule schema
export const validationRuleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().nullable().optional(),
  ruleType: z.string().min(1, "Tipo de regra é obrigatório"),
  config: z.record(z.string(), z.unknown()),
  actionType: z.enum(["CLASSIFY", "BLOCK", "ALERT", "QUEUE"]).default("ALERT"),
  active: z.boolean().default(true),
});

export type ClassificationRuleInput = z.infer<typeof classificationRuleSchema>;
export type InternalTransferInput = z.infer<typeof internalTransferSchema>;
export type ValidationRuleInput = z.infer<typeof validationRuleSchema>;
