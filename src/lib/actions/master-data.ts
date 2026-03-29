"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import {
  chartOfAccountSchema,
  supplierSchema,
  customerSchema,
  costCenterSchema,
  bankAccountSchema,
  paymentMethodSchema,
  productSchema,
  warehouseSchema,
  type ChartOfAccountInput,
  type SupplierInput,
  type CustomerInput,
  type CostCenterInput,
  type BankAccountInput,
  type PaymentMethodInput,
  type ProductInput,
  type WarehouseInput,
} from "@/lib/validations/master-data";

// ─── Chart of Accounts ────────────────────────────────────

export async function listChartOfAccounts() {
  const user = await getCurrentUser();
  return prisma.chartOfAccount.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { code: "asc" },
    include: { parent: { select: { code: true, name: true } } },
  });
}

export async function createChartOfAccount(data: ChartOfAccountInput) {
  const user = await getCurrentUser();
  const validated = chartOfAccountSchema.parse(data);

  // Compute level from code segments (e.g. "1" = 1, "1.1" = 2, "1.1.01" = 3)
  const level = validated.code.split(".").length;

  const record = await prisma.chartOfAccount.create({
    data: { ...validated, level, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "ChartOfAccount",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/chart-of-accounts");
  return record;
}

export async function updateChartOfAccount(
  id: string,
  data: ChartOfAccountInput
) {
  const user = await getCurrentUser();
  const validated = chartOfAccountSchema.parse(data);

  const existing = await prisma.chartOfAccount.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.chartOfAccount.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "ChartOfAccount",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/chart-of-accounts");
  return record;
}

export async function deleteChartOfAccount(id: string) {
  const user = await getCurrentUser();

  await prisma.chartOfAccount.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.chartOfAccount.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "ChartOfAccount",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/chart-of-accounts");
}

// ─── Suppliers ────────────────────────────────────────────

export async function listSuppliers() {
  const user = await getCurrentUser();
  return prisma.supplier.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(data: SupplierInput) {
  const user = await getCurrentUser();
  const validated = supplierSchema.parse(data);

  const record = await prisma.supplier.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Supplier",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/suppliers");
  return record;
}

export async function updateSupplier(id: string, data: SupplierInput) {
  const user = await getCurrentUser();
  const validated = supplierSchema.parse(data);

  const existing = await prisma.supplier.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.supplier.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Supplier",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/suppliers");
  return record;
}

export async function deleteSupplier(id: string) {
  const user = await getCurrentUser();

  await prisma.supplier.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.supplier.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Supplier",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/suppliers");
}

// ─── Customers ────────────────────────────────────────────

export async function listCustomers() {
  const user = await getCurrentUser();
  return prisma.customer.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createCustomer(data: CustomerInput) {
  const user = await getCurrentUser();
  const validated = customerSchema.parse(data);

  const record = await prisma.customer.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Customer",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/customers");
  return record;
}

export async function updateCustomer(id: string, data: CustomerInput) {
  const user = await getCurrentUser();
  const validated = customerSchema.parse(data);

  const existing = await prisma.customer.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.customer.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Customer",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/customers");
  return record;
}

export async function deleteCustomer(id: string) {
  const user = await getCurrentUser();

  await prisma.customer.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.customer.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Customer",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/customers");
}

// ─── Cost Centers ─────────────────────────────────────────

export async function listCostCenters() {
  const user = await getCurrentUser();
  return prisma.costCenter.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { code: "asc" },
    include: { parent: { select: { code: true, name: true } } },
  });
}

export async function createCostCenter(data: CostCenterInput) {
  const user = await getCurrentUser();
  const validated = costCenterSchema.parse(data);

  const record = await prisma.costCenter.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "CostCenter",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/cost-centers");
  return record;
}

export async function updateCostCenter(id: string, data: CostCenterInput) {
  const user = await getCurrentUser();
  const validated = costCenterSchema.parse(data);

  const existing = await prisma.costCenter.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.costCenter.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "CostCenter",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/cost-centers");
  return record;
}

export async function deleteCostCenter(id: string) {
  const user = await getCurrentUser();

  await prisma.costCenter.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.costCenter.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "CostCenter",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/cost-centers");
}

// ─── Bank Accounts ────────────────────────────────────────

export async function listBankAccounts() {
  const user = await getCurrentUser();
  return prisma.bankAccount.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { bankName: "asc" },
  });
}

export async function createBankAccount(data: BankAccountInput) {
  const user = await getCurrentUser();
  const validated = bankAccountSchema.parse(data);

  const record = await prisma.bankAccount.create({
    data: {
      ...validated,
      currentBalance: validated.initialBalance,
      tenantId: user.tenantId,
    },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "BankAccount",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/bank-accounts");
  return record;
}

export async function updateBankAccount(id: string, data: BankAccountInput) {
  const user = await getCurrentUser();
  const validated = bankAccountSchema.parse(data);

  const existing = await prisma.bankAccount.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.bankAccount.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "BankAccount",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/bank-accounts");
  return record;
}

export async function deleteBankAccount(id: string) {
  const user = await getCurrentUser();

  await prisma.bankAccount.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.bankAccount.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "BankAccount",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/bank-accounts");
}

// ─── Payment Methods ──────────────────────────────────────

export async function listPaymentMethods() {
  const user = await getCurrentUser();
  return prisma.paymentMethod.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createPaymentMethod(data: PaymentMethodInput) {
  const user = await getCurrentUser();
  const validated = paymentMethodSchema.parse(data);

  const record = await prisma.paymentMethod.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PaymentMethod",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/payment-methods");
  return record;
}

export async function updatePaymentMethod(
  id: string,
  data: PaymentMethodInput
) {
  const user = await getCurrentUser();
  const validated = paymentMethodSchema.parse(data);

  const existing = await prisma.paymentMethod.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.paymentMethod.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PaymentMethod",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/payment-methods");
  return record;
}

export async function deletePaymentMethod(id: string) {
  const user = await getCurrentUser();

  await prisma.paymentMethod.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.paymentMethod.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PaymentMethod",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/payment-methods");
}

// ─── Products ─────────────────────────────────────────────

export async function listProducts() {
  const user = await getCurrentUser();
  return prisma.product.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { code: "asc" },
  });
}

export async function createProduct(data: ProductInput) {
  const user = await getCurrentUser();
  const validated = productSchema.parse(data);

  const record = await prisma.product.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Product",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/products");
  return record;
}

export async function updateProduct(id: string, data: ProductInput) {
  const user = await getCurrentUser();
  const validated = productSchema.parse(data);

  const existing = await prisma.product.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.product.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Product",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/products");
  return record;
}

export async function deleteProduct(id: string) {
  const user = await getCurrentUser();

  await prisma.product.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.product.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Product",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/products");
}

// ─── Warehouses ───────────────────────────────────────────

export async function listWarehouses() {
  const user = await getCurrentUser();
  return prisma.warehouse.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createWarehouse(data: WarehouseInput) {
  const user = await getCurrentUser();
  const validated = warehouseSchema.parse(data);

  const record = await prisma.warehouse.create({
    data: { ...validated, tenantId: user.tenantId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Warehouse",
    recordId: record.id,
    action: "CREATE",
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/warehouses");
  return record;
}

export async function updateWarehouse(id: string, data: WarehouseInput) {
  const user = await getCurrentUser();
  const validated = warehouseSchema.parse(data);

  const existing = await prisma.warehouse.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  const record = await prisma.warehouse.update({
    where: { id },
    data: validated,
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Warehouse",
    recordId: id,
    action: "UPDATE",
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: validated as unknown as Record<string, unknown>,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/warehouses");
  return record;
}

export async function deleteWarehouse(id: string) {
  const user = await getCurrentUser();

  await prisma.warehouse.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.warehouse.update({
    where: { id },
    data: { active: false },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Warehouse",
    recordId: id,
    action: "UPDATE",
    oldValues: { active: true },
    newValues: { active: false },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/warehouses");
}

// ─── Chart of Accounts Templates ─────────────────────────

export async function applyChartTemplate(
  templateId: string,
  options?: { clearExisting?: boolean }
) {
  const user = await requireRole(["ADMIN"]);

  const { CHART_TEMPLATES } = await import("@/lib/constants/chart-templates");
  const template = CHART_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Template não encontrado");

  // Use transaction
  const result = await prisma.$transaction(async (tx) => {
    if (options?.clearExisting) {
      // Check if any OfficialEntries reference these accounts (can't delete those)
      const entriesCount = await tx.officialEntry.count({
        where: { tenantId: user.tenantId },
      });
      if (entriesCount > 0) {
        throw new Error(
          `Não é possível substituir as categorias: existem ${entriesCount} lançamento(s) vinculado(s). Remova os lançamentos primeiro.`
        );
      }

      // 1. Remove optional FK references
      await tx.classificationRule.updateMany({
        where: { tenantId: user.tenantId, chartOfAccountId: { not: null } },
        data: { chartOfAccountId: null },
      });
      await tx.stagingEntry.updateMany({
        where: { tenantId: user.tenantId, chartOfAccountId: { not: null } },
        data: { chartOfAccountId: null },
      });

      // 2. Delete dependent records with required FK
      await tx.budgetLine.deleteMany({
        where: { tenantId: user.tenantId },
      });
      await tx.recurringRule.deleteMany({
        where: { tenantId: user.tenantId },
      });

      // 3. Nullify self-referencing parentId to avoid FK constraint
      await tx.chartOfAccount.updateMany({
        where: { tenantId: user.tenantId, parentId: { not: null } },
        data: { parentId: null },
      });

      // 4. Now safe to delete all accounts
      await tx.chartOfAccount.deleteMany({
        where: { tenantId: user.tenantId },
      });
    }

    // Build accounts in order, maintaining code→id map for parent resolution
    const codeToId = new Map<string, string>();
    let created = 0;

    for (const acc of template.accounts) {
      const parentId = acc.parentCode ? codeToId.get(acc.parentCode) : null;

      // Skip if code already exists (when not clearing)
      if (!options?.clearExisting) {
        const existing = await tx.chartOfAccount.findUnique({
          where: { tenantId_code: { tenantId: user.tenantId, code: acc.code } },
        });
        if (existing) {
          codeToId.set(acc.code, existing.id);
          continue;
        }
      }

      const record = await tx.chartOfAccount.create({
        data: {
          tenantId: user.tenantId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          level: acc.level,
          isAnalytic: acc.isAnalytic,
          parentId: parentId || undefined,
          active: true,
        },
      });

      codeToId.set(acc.code, record.id);
      created++;
    }

    return created;
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "ChartOfAccount",
    recordId: "template",
    action: "CREATE",
    newValues: { templateId, clearExisting: options?.clearExisting, count: result },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/chart-of-accounts");

  return { created: result, templateName: template.name };
}

export async function listChartTemplates() {
  const { CHART_TEMPLATES } = await import("@/lib/constants/chart-templates");
  return CHART_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    accountCount: t.accounts.length,
  }));
}

// ─── Product Templates ──────────────────────────────────

export async function applyProductTemplate(
  templateId: string,
  options?: { clearExisting?: boolean }
) {
  const user = await requireRole(["ADMIN"]);

  const { PRODUCT_TEMPLATES } = await import("@/lib/constants/product-templates");
  const template = PRODUCT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Template de produtos não encontrado");

  const result = await prisma.$transaction(async (tx) => {
    if (options?.clearExisting) {
      // Check for stock movements or purchase invoice items referencing products
      const movementsCount = await tx.stockMovement.count({
        where: { product: { tenantId: user.tenantId } },
      });
      const invoiceItemsCount = await tx.purchaseInvoiceItem.count({
        where: { product: { tenantId: user.tenantId } },
      });
      if (movementsCount > 0 || invoiceItemsCount > 0) {
        throw new Error(
          `Não é possível substituir os produtos: existem ${movementsCount} movimentação(ões) de estoque e ${invoiceItemsCount} item(ns) de nota fiscal vinculados.`
        );
      }

      await tx.product.deleteMany({
        where: { tenantId: user.tenantId },
      });
    }

    let created = 0;

    for (const prod of template.products) {
      // Skip if code already exists (when not clearing)
      if (!options?.clearExisting) {
        const existing = await tx.product.findUnique({
          where: { tenantId_code: { tenantId: user.tenantId, code: prod.code } },
        });
        if (existing) continue;
      }

      await tx.product.create({
        data: {
          tenantId: user.tenantId,
          code: prod.code,
          name: prod.name,
          description: prod.description ?? null,
          unit: prod.unit,
          costPrice: prod.costPrice,
          salePrice: prod.salePrice,
          minStock: 0,
          reorderPoint: 0,
          active: true,
        },
      });
      created++;
    }

    return created;
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "Product",
    recordId: "template",
    action: "CREATE",
    newValues: { templateId, clearExisting: options?.clearExisting, count: result },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/master-data/products");

  return { created: result, templateName: template.name };
}

export async function listProductTemplates() {
  const { PRODUCT_TEMPLATES } = await import("@/lib/constants/product-templates");
  return PRODUCT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    productCount: t.products.length,
  }));
}
