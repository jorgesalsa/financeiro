import { z } from "zod";

export const stagingEntrySchema = z.object({
  date: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  competenceDate: z.coerce.date().nullable().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum(["CREDIT", "DEBIT"]),
  counterpartCnpjCpf: z.string().nullable().optional(),
  counterpartName: z.string().nullable().optional(),
  chartOfAccountId: z.string().nullable().optional(),
  costCenterId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  paymentMethodId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // RA05: 4-layer taxonomy
  movementType: z.enum(["ENTRY", "EXIT", "TRANSFER", "ADJUSTMENT"]).nullable().optional(),
  financialNature: z.enum(["OPERATIONAL", "NON_OPERATIONAL", "FINANCIAL", "PATRIMONIAL"]).nullable().optional(),
  // Settlement data to auto-settle on incorporation
  pendingSettlement: z.object({
    amount: z.coerce.number().positive(),
    interestAmount: z.coerce.number().min(0).default(0),
    fineAmount: z.coerce.number().min(0).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
    date: z.string(),
    bankAccountId: z.string().min(1),
    paymentMethodId: z.string().nullable().optional(),
  }).nullable().optional(),
});

export type StagingEntryInput = z.infer<typeof stagingEntrySchema>;
