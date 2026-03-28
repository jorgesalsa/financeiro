import { z } from "zod";

export const officialEntrySchema = z.object({
  date: z.coerce.date(),
  competenceDate: z.coerce.date(), // RA01: obrigatório
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum(["CREDIT", "DEBIT"]),
  category: z.enum(["PAYABLE", "RECEIVABLE", "TRANSFER", "ADJUSTMENT"]),
  chartOfAccountId: z.string().min(1, "Conta contábil é obrigatória"),
  costCenterId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  bankAccountId: z.string().min(1, "Conta bancária é obrigatória"),
  paymentMethodId: z.string().nullable().optional(),
  documentNumber: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  // RA05: 4-layer taxonomy
  movementType: z.enum(["ENTRY", "EXIT", "TRANSFER", "ADJUSTMENT"]).nullable().optional(),
  financialNature: z.enum(["OPERATIONAL", "NON_OPERATIONAL", "FINANCIAL", "PATRIMONIAL"]).nullable().optional(),
});

export const settlementSchema = z.object({
  officialEntryId: z.string().min(1, "Lançamento é obrigatório"),
  date: z.coerce.date(),
  // RA01: Settlement date (can differ from accounting date)
  settlementDate: z.coerce.date().nullable().optional(),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  interestAmount: z.coerce.number().min(0).default(0),
  fineAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  bankAccountId: z.string().min(1, "Conta bancária é obrigatória"),
  paymentMethodId: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const installmentSchema = z.object({
  officialEntryId: z.string().min(1),
  numberOfInstallments: z.coerce.number().int().min(2).max(360),
  firstDueDate: z.coerce.date(),
  intervalDays: z.coerce.number().int().min(1).default(30),
});

export const recurringRuleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().nullable().optional(),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum(["CREDIT", "DEBIT"]),
  category: z.enum(["PAYABLE", "RECEIVABLE"]),
  chartOfAccountId: z.string().min(1, "Conta contábil é obrigatória"),
  costCenterId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  bankAccountId: z.string().min(1, "Conta bancária é obrigatória"),
  paymentMethodId: z.string().nullable().optional(),
  frequency: z.enum([
    "DAILY",
    "WEEKLY",
    "BIWEEKLY",
    "MONTHLY",
    "BIMONTHLY",
    "QUARTERLY",
    "SEMIANNUAL",
    "ANNUAL",
  ]),
  dayOfMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  active: z.boolean().default(true),
});

export type OfficialEntryInput = z.infer<typeof officialEntrySchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
export type InstallmentInput = z.infer<typeof installmentSchema>;
export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;
