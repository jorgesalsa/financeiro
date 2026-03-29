import { z } from "zod";

export const chartOfAccountSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["REVENUE", "DEDUCTION", "COST", "EXPENSE", "INVESTMENT"]),
  parentId: z.string().nullable().optional(),
  isAnalytic: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  tradeName: z.string().nullable().optional(),
  cnpjCpf: z.string().min(11, "CNPJ/CPF é obrigatório"),
  stateRegistration: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const customerSchema = supplierSchema;

export const costCenterSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  parentId: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Nome do banco é obrigatório"),
  bankCode: z.string().min(1, "Código do banco é obrigatório"),
  agency: z.string().min(1, "Agência é obrigatória"),
  accountNumber: z.string().min(1, "Número da conta é obrigatório"),
  accountType: z.enum(["CHECKING", "SAVINGS", "INVESTMENT"]),
  initialBalance: z.coerce.number().default(0),
  active: z.boolean().default(true),
});

export const paymentMethodSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["CASH", "BANK_TRANSFER", "PIX", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "CHECK", "OTHER"]),
  daysToSettle: z.coerce.number().int().min(0).default(0),
  feePercentage: z.coerce.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().nullable().optional(),
  unit: z.string().min(1, "Unidade é obrigatória"),
  costPrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
});

export const warehouseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  location: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export type ChartOfAccountInput = z.infer<typeof chartOfAccountSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CostCenterInput = z.infer<typeof costCenterSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
