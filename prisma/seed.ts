import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Please configure your .env file.");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- Starting seed ---\n");

  // ─── 1. Tenant ──────────────────────────────────────────────────────────────
  console.log("Creating default tenant...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "empresa-demo" },
    update: {},
    create: {
      name: "Empresa Demo Ltda",
      cnpj: "12.345.678/0001-90",
      slug: "empresa-demo",
      active: true,
    },
  });
  console.log(`  Tenant created: ${tenant.name} (${tenant.id})`);

  // ─── 2. Admin User ─────────────────────────────────────────────────────────
  console.log("Creating admin user...");
  const hashedPassword = await hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@demo.com",
      hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`  User created: ${user.name} (${user.id})`);

  // ─── 3. Membership ─────────────────────────────────────────────────────────
  console.log("Creating membership...");
  const membership = await prisma.membership.upsert({
    where: {
      userId_tenantId: { userId: user.id, tenantId: tenant.id },
    },
    update: {},
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "ADMIN",
      isDefault: true,
    },
  });
  console.log(`  Membership created: ${membership.id}`);

  // ─── 4. Chart of Accounts ──────────────────────────────────────────────────
  console.log("Creating chart of accounts...");

  // Delete existing chart of accounts for this tenant to avoid duplicates
  await prisma.chartOfAccount.deleteMany({ where: { tenantId: tenant.id } });

  type AccountDef = {
    code: string;
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
    level: number;
    isAnalytic: boolean;
    children?: AccountDef[];
  };

  const chartData: AccountDef[] = [
    {
      code: "1",
      name: "ATIVO",
      type: "ASSET",
      level: 1,
      isAnalytic: false,
      children: [
        {
          code: "1.1",
          name: "Ativo Circulante",
          type: "ASSET",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "1.1.1", name: "Caixa e Equivalentes", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.1.2", name: "Bancos Conta Movimento", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.1.3", name: "Aplica\u00e7\u00f5es Financeiras", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.1.4", name: "Contas a Receber", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.1.5", name: "Estoques", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.1.6", name: "Impostos a Recuperar", type: "ASSET", level: 3, isAnalytic: true },
          ],
        },
        {
          code: "1.2",
          name: "Ativo N\u00e3o Circulante",
          type: "ASSET",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "1.2.1", name: "Investimentos", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.2.2", name: "Imobilizado", type: "ASSET", level: 3, isAnalytic: true },
            { code: "1.2.3", name: "Intang\u00edvel", type: "ASSET", level: 3, isAnalytic: true },
          ],
        },
      ],
    },
    {
      code: "2",
      name: "PASSIVO",
      type: "LIABILITY",
      level: 1,
      isAnalytic: false,
      children: [
        {
          code: "2.1",
          name: "Passivo Circulante",
          type: "LIABILITY",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "2.1.1", name: "Fornecedores", type: "LIABILITY", level: 3, isAnalytic: true },
            { code: "2.1.2", name: "Empr\u00e9stimos e Financiamentos CP", type: "LIABILITY", level: 3, isAnalytic: true },
            { code: "2.1.3", name: "Obriga\u00e7\u00f5es Trabalhistas", type: "LIABILITY", level: 3, isAnalytic: true },
            { code: "2.1.4", name: "Obriga\u00e7\u00f5es Tribut\u00e1rias", type: "LIABILITY", level: 3, isAnalytic: true },
            { code: "2.1.5", name: "Contas a Pagar", type: "LIABILITY", level: 3, isAnalytic: true },
          ],
        },
        {
          code: "2.2",
          name: "Passivo N\u00e3o Circulante",
          type: "LIABILITY",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "2.2.1", name: "Empr\u00e9stimos e Financiamentos LP", type: "LIABILITY", level: 3, isAnalytic: true },
            { code: "2.2.2", name: "Provis\u00f5es", type: "LIABILITY", level: 3, isAnalytic: true },
          ],
        },
      ],
    },
    {
      code: "3",
      name: "PATRIM\u00d4NIO L\u00cdQUIDO",
      type: "EQUITY",
      level: 1,
      isAnalytic: false,
      children: [
        { code: "3.1", name: "Capital Social", type: "EQUITY", level: 2, isAnalytic: true },
        { code: "3.2", name: "Reservas", type: "EQUITY", level: 2, isAnalytic: true },
        { code: "3.3", name: "Lucros/Preju\u00edzos Acumulados", type: "EQUITY", level: 2, isAnalytic: true },
      ],
    },
    {
      code: "4",
      name: "RECEITAS",
      type: "REVENUE",
      level: 1,
      isAnalytic: false,
      children: [
        {
          code: "4.1",
          name: "Receita Operacional",
          type: "REVENUE",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "4.1.1", name: "Receita de Vendas", type: "REVENUE", level: 3, isAnalytic: true },
            { code: "4.1.2", name: "Receita de Servi\u00e7os", type: "REVENUE", level: 3, isAnalytic: true },
          ],
        },
        { code: "4.2", name: "Receitas Financeiras", type: "REVENUE", level: 2, isAnalytic: true },
        { code: "4.3", name: "Outras Receitas", type: "REVENUE", level: 2, isAnalytic: true },
      ],
    },
    {
      code: "5",
      name: "DESPESAS",
      type: "EXPENSE",
      level: 1,
      isAnalytic: false,
      children: [
        {
          code: "5.1",
          name: "Custo dos Produtos/Servi\u00e7os Vendidos",
          type: "EXPENSE",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "5.1.1", name: "CMV - Mercadorias", type: "EXPENSE", level: 3, isAnalytic: true },
            { code: "5.1.2", name: "CSP - Servi\u00e7os", type: "EXPENSE", level: 3, isAnalytic: true },
          ],
        },
        {
          code: "5.2",
          name: "Despesas Operacionais",
          type: "EXPENSE",
          level: 2,
          isAnalytic: false,
          children: [
            { code: "5.2.1", name: "Despesas com Pessoal", type: "EXPENSE", level: 3, isAnalytic: true },
            { code: "5.2.2", name: "Despesas Administrativas", type: "EXPENSE", level: 3, isAnalytic: true },
            { code: "5.2.3", name: "Despesas Comerciais", type: "EXPENSE", level: 3, isAnalytic: true },
            { code: "5.2.4", name: "Despesas Tribut\u00e1rias", type: "EXPENSE", level: 3, isAnalytic: true },
          ],
        },
        { code: "5.3", name: "Despesas Financeiras", type: "EXPENSE", level: 2, isAnalytic: true },
        { code: "5.4", name: "Deprecia\u00e7\u00e3o e Amortiza\u00e7\u00e3o", type: "EXPENSE", level: 2, isAnalytic: true },
      ],
    },
  ];

  // Map from code -> id so we can set parentId
  const codeToId: Record<string, string> = {};

  async function createAccounts(accounts: AccountDef[], parentId: string | null) {
    for (const acct of accounts) {
      const created = await prisma.chartOfAccount.create({
        data: {
          tenantId: tenant.id,
          code: acct.code,
          name: acct.name,
          type: acct.type,
          level: acct.level,
          isAnalytic: acct.isAnalytic,
          parentId,
          active: true,
        },
      });
      codeToId[acct.code] = created.id;
      console.log(`  Account: ${acct.code} - ${acct.name}`);

      if (acct.children) {
        await createAccounts(acct.children, created.id);
      }
    }
  }

  await createAccounts(chartData, null);
  console.log(`  Chart of accounts created: ${Object.keys(codeToId).length} accounts\n`);

  // ─── 5. Cost Centers ───────────────────────────────────────────────────────
  console.log("Creating cost centers...");
  await prisma.costCenter.deleteMany({ where: { tenantId: tenant.id } });

  const costCentersData = [
    { code: "ADM", name: "Administrativo" },
    { code: "COM", name: "Comercial" },
    { code: "FIN", name: "Financeiro" },
    { code: "OPE", name: "Operacional" },
  ];

  const costCenters: Record<string, string> = {};
  for (const cc of costCentersData) {
    const created = await prisma.costCenter.create({
      data: {
        tenantId: tenant.id,
        code: cc.code,
        name: cc.name,
        active: true,
      },
    });
    costCenters[cc.code] = created.id;
    console.log(`  Cost Center: ${cc.code} - ${cc.name}`);
  }

  // ─── 6. Bank Accounts ─────────────────────────────────────────────────────
  console.log("Creating bank accounts...");
  await prisma.bankAccount.deleteMany({ where: { tenantId: tenant.id } });

  const bankAccountsData = [
    {
      bankName: "Banco do Brasil",
      bankCode: "001",
      agency: "1234",
      accountNumber: "56789-0",
      accountType: "CHECKING" as const,
      initialBalance: 50000,
      currentBalance: 50000,
    },
    {
      bankName: "Ita\u00fa",
      bankCode: "341",
      agency: "5678",
      accountNumber: "12345-6",
      accountType: "CHECKING" as const,
      initialBalance: 75000,
      currentBalance: 75000,
    },
  ];

  const bankAccounts: Record<string, string> = {};
  for (const ba of bankAccountsData) {
    const created = await prisma.bankAccount.create({
      data: {
        tenantId: tenant.id,
        bankName: ba.bankName,
        bankCode: ba.bankCode,
        agency: ba.agency,
        accountNumber: ba.accountNumber,
        accountType: ba.accountType,
        initialBalance: ba.initialBalance,
        currentBalance: ba.currentBalance,
        active: true,
      },
    });
    bankAccounts[ba.bankCode] = created.id;
    console.log(`  Bank Account: ${ba.bankName} - Ag ${ba.agency} CC ${ba.accountNumber}`);
  }

  // ─── 7. Payment Methods ───────────────────────────────────────────────────
  console.log("Creating payment methods...");
  await prisma.paymentMethod.deleteMany({ where: { tenantId: tenant.id } });

  const paymentMethodsData = [
    { name: "Dinheiro", type: "CASH" as const, daysToSettle: 0, feePercentage: 0 },
    { name: "Boleto", type: "BOLETO" as const, daysToSettle: 1, feePercentage: 0 },
    { name: "Cart\u00e3o de Cr\u00e9dito", type: "CREDIT_CARD" as const, daysToSettle: 30, feePercentage: 2.5 },
    { name: "Cart\u00e3o de D\u00e9bito", type: "DEBIT_CARD" as const, daysToSettle: 1, feePercentage: 1.5 },
    { name: "PIX/TED", type: "PIX" as const, daysToSettle: 0, feePercentage: 0 },
  ];

  const paymentMethods: Record<string, string> = {};
  for (const pm of paymentMethodsData) {
    const created = await prisma.paymentMethod.create({
      data: {
        tenantId: tenant.id,
        name: pm.name,
        type: pm.type,
        daysToSettle: pm.daysToSettle,
        feePercentage: pm.feePercentage,
        active: true,
      },
    });
    paymentMethods[pm.name] = created.id;
    console.log(`  Payment Method: ${pm.name} (${pm.type})`);
  }

  // ─── 8. Suppliers ──────────────────────────────────────────────────────────
  console.log("Creating suppliers...");
  await prisma.supplier.deleteMany({ where: { tenantId: tenant.id } });

  const suppliersData = [
    {
      name: "Tech Solutions Inform\u00e1tica Ltda",
      tradeName: "Tech Solutions",
      cnpjCpf: "11.222.333/0001-44",
      email: "contato@techsolutions.com.br",
      phone: "(11) 3333-4444",
      address: "Av. Paulista, 1000",
      city: "S\u00e3o Paulo",
      state: "SP",
      zipCode: "01310-100",
    },
    {
      name: "Papelaria Central Ltda",
      tradeName: "Papelaria Central",
      cnpjCpf: "22.333.444/0001-55",
      email: "vendas@papelcentral.com.br",
      phone: "(11) 2222-3333",
      address: "Rua Augusta, 500",
      city: "S\u00e3o Paulo",
      state: "SP",
      zipCode: "01304-000",
    },
    {
      name: "Log\u00edstica Veloz Transportes S/A",
      tradeName: "Log\u00edstica Veloz",
      cnpjCpf: "33.444.555/0001-66",
      email: "comercial@logisticaveloz.com.br",
      phone: "(21) 4444-5555",
      address: "Rodovia Presidente Dutra, Km 200",
      city: "Rio de Janeiro",
      state: "RJ",
      zipCode: "20040-020",
    },
  ];

  const suppliers: Record<string, string> = {};
  for (const s of suppliersData) {
    const created = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: s.name,
        tradeName: s.tradeName,
        cnpjCpf: s.cnpjCpf,
        email: s.email,
        phone: s.phone,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        active: true,
      },
    });
    suppliers[s.cnpjCpf] = created.id;
    console.log(`  Supplier: ${s.tradeName} (${s.cnpjCpf})`);
  }

  // ─── 9. Customers ─────────────────────────────────────────────────────────
  console.log("Creating customers...");
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } });

  const customersData = [
    {
      name: "ABC Com\u00e9rcio e Distribui\u00e7\u00e3o Ltda",
      tradeName: "ABC Distribuidora",
      cnpjCpf: "44.555.666/0001-77",
      email: "compras@abcdistribuidora.com.br",
      phone: "(11) 5555-6666",
      address: "Rua da Consola\u00e7\u00e3o, 200",
      city: "S\u00e3o Paulo",
      state: "SP",
      zipCode: "01302-000",
    },
    {
      name: "Construtora Horizonte S/A",
      tradeName: "Horizonte Engenharia",
      cnpjCpf: "55.666.777/0001-88",
      email: "financeiro@horizonteeng.com.br",
      phone: "(31) 6666-7777",
      address: "Av. Afonso Pena, 1500",
      city: "Belo Horizonte",
      state: "MG",
      zipCode: "30130-009",
    },
    {
      name: "Restaurante Sabor & Arte Ltda",
      tradeName: "Sabor & Arte",
      cnpjCpf: "66.777.888/0001-99",
      email: "adm@saborarte.com.br",
      phone: "(21) 7777-8888",
      address: "Rua Copacabana, 300",
      city: "Rio de Janeiro",
      state: "RJ",
      zipCode: "22020-001",
    },
  ];

  const customers: Record<string, string> = {};
  for (const c of customersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: c.name,
        tradeName: c.tradeName,
        cnpjCpf: c.cnpjCpf,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        active: true,
      },
    });
    customers[c.cnpjCpf] = created.id;
    console.log(`  Customer: ${c.tradeName} (${c.cnpjCpf})`);
  }

  // ─── 10. Products ─────────────────────────────────────────────────────────
  console.log("Creating products...");
  await prisma.product.deleteMany({ where: { tenantId: tenant.id } });

  const productsData = [
    {
      code: "PROD001",
      name: "Notebook Dell Inspiron 15",
      description: "Notebook Dell Inspiron 15, Intel Core i7, 16GB RAM, 512GB SSD",
      unit: "UN",
      costPrice: 3500.0,
      salePrice: 4500.0,
      minStock: 5,
      reorderPoint: 10,
    },
    {
      code: "PROD002",
      name: "Resma de Papel A4 500fls",
      description: "Resma de papel sulfite A4, 75g/m2, 500 folhas",
      unit: "UN",
      costPrice: 22.0,
      salePrice: 35.0,
      minStock: 50,
      reorderPoint: 100,
    },
    {
      code: "PROD003",
      name: "Cadeira Ergon\u00f4mica Escritorio",
      description: "Cadeira ergon\u00f4mica com apoio lombar, ajuste de altura e bra\u00e7os",
      unit: "UN",
      costPrice: 800.0,
      salePrice: 1200.0,
      minStock: 3,
      reorderPoint: 5,
    },
  ];

  const products: Record<string, string> = {};
  for (const p of productsData) {
    const created = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        code: p.code,
        name: p.name,
        description: p.description,
        unit: p.unit,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        minStock: p.minStock,
        reorderPoint: p.reorderPoint,
        active: true,
      },
    });
    products[p.code] = created.id;
    console.log(`  Product: ${p.code} - ${p.name}`);
  }

  // ─── 11. Warehouse ────────────────────────────────────────────────────────
  console.log("Creating warehouse...");
  await prisma.warehouse.deleteMany({ where: { tenantId: tenant.id } });

  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: "Almoxarifado Central",
      location: "Galpao 1 - Sede",
      active: true,
    },
  });
  console.log(`  Warehouse: ${warehouse.name}`);

  // ─── 12. Classification Rules ─────────────────────────────────────────────
  console.log("Creating classification rules...");
  await prisma.classificationRule.deleteMany({ where: { tenantId: tenant.id } });

  const classificationRulesData = [
    {
      priority: 1,
      field: "CNPJ" as const,
      pattern: "11.222.333/0001-44",
      chartOfAccountId: codeToId["5.2.2"], // Despesas Administrativas
      costCenterId: costCenters["ADM"],
      supplierId: suppliers["11.222.333/0001-44"],
    },
    {
      priority: 2,
      field: "DESCRIPTION" as const,
      pattern: "ALUGUEL",
      chartOfAccountId: codeToId["5.2.2"], // Despesas Administrativas
      costCenterId: costCenters["ADM"],
    },
    {
      priority: 3,
      field: "VALUE_RANGE" as const,
      pattern: "0-500",
      chartOfAccountId: codeToId["5.2.3"], // Despesas Comerciais
      costCenterId: costCenters["COM"],
    },
  ];

  for (const rule of classificationRulesData) {
    const created = await prisma.classificationRule.create({
      data: {
        tenantId: tenant.id,
        priority: rule.priority,
        field: rule.field,
        pattern: rule.pattern,
        chartOfAccountId: rule.chartOfAccountId,
        costCenterId: rule.costCenterId ?? null,
        supplierId: rule.supplierId ?? null,
        active: true,
      },
    });
    console.log(`  Classification Rule: ${rule.field} -> "${rule.pattern}" (priority ${rule.priority})`);
  }

  // ─── 13. Budget Lines ─────────────────────────────────────────────────────
  console.log("Creating budget lines...");
  await prisma.budgetLine.deleteMany({ where: { tenantId: tenant.id } });

  const currentYear = new Date().getFullYear();

  const budgetLinesData = [
    {
      year: currentYear,
      month: 1,
      chartOfAccountCode: "4.1.1", // Receita de Vendas
      costCenterCode: "COM",
      budgetAmount: 150000,
      notes: "Meta de vendas Q1",
    },
    {
      year: currentYear,
      month: 1,
      chartOfAccountCode: "5.2.1", // Despesas com Pessoal
      costCenterCode: "ADM",
      budgetAmount: 45000,
      notes: "Folha de pagamento + encargos",
    },
    {
      year: currentYear,
      month: 2,
      chartOfAccountCode: "4.1.1",
      costCenterCode: "COM",
      budgetAmount: 160000,
      notes: "Meta de vendas fevereiro",
    },
    {
      year: currentYear,
      month: 2,
      chartOfAccountCode: "5.2.2", // Despesas Administrativas
      costCenterCode: "ADM",
      budgetAmount: 25000,
      notes: "Aluguel, utilidades, escritorio",
    },
    {
      year: currentYear,
      month: 3,
      chartOfAccountCode: "4.1.2", // Receita de Servicos
      costCenterCode: "OPE",
      budgetAmount: 80000,
      notes: "Contratos de servico Q1",
    },
    {
      year: currentYear,
      month: 3,
      chartOfAccountCode: "5.3", // Despesas Financeiras
      costCenterCode: "FIN",
      budgetAmount: 5000,
      notes: "Juros e tarifas bancarias",
    },
  ];

  for (const bl of budgetLinesData) {
    const created = await prisma.budgetLine.create({
      data: {
        tenantId: tenant.id,
        year: bl.year,
        month: bl.month,
        chartOfAccountId: codeToId[bl.chartOfAccountCode],
        costCenterId: costCenters[bl.costCenterCode],
        budgetAmount: bl.budgetAmount,
        notes: bl.notes,
      },
    });
    console.log(`  Budget Line: ${bl.year}/${String(bl.month).padStart(2, "0")} - ${bl.chartOfAccountCode} (${bl.costCenterCode}) = R$ ${bl.budgetAmount.toLocaleString("pt-BR")}`);
  }

  console.log("\n--- Seed completed successfully! ---");
  console.log(`
Summary:
  - 1 Tenant
  - 1 User (admin@demo.com / admin123)
  - 1 Membership (ADMIN)
  - ${Object.keys(codeToId).length} Chart of Account entries
  - ${costCentersData.length} Cost Centers
  - ${bankAccountsData.length} Bank Accounts
  - ${paymentMethodsData.length} Payment Methods
  - ${suppliersData.length} Suppliers
  - ${customersData.length} Customers
  - ${productsData.length} Products
  - 1 Warehouse
  - ${classificationRulesData.length} Classification Rules
  - ${budgetLinesData.length} Budget Lines
  `);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
