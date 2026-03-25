import { z } from "zod";

export const stagingEntrySchema = z.object({
  date: z.coerce.date(),
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
});

export type StagingEntryInput = z.infer<typeof stagingEntrySchema>;
