import { listStagingEntries, getStagingStatusCounts } from "@/lib/actions/staging";
import {
  listChartOfAccounts,
  listCostCenters,
  listBankAccounts,
  listSuppliers,
  listCustomers,
  listPaymentMethods,
} from "@/lib/actions/master-data";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { StagingClient } from "./client";

export default async function StagingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const statusFilter = params.status && params.status !== "ALL" ? params.status : undefined;

  const [result, statusCounts, user, chartOfAccounts, costCenters, bankAccounts, suppliers, customers, paymentMethods] =
    await Promise.all([
      listStagingEntries({ status: statusFilter, pagination: { page, pageSize: 50 } }),
      getStagingStatusCounts(),
      getCurrentUser(),
      listChartOfAccounts(),
      listCostCenters(),
      listBankAccounts(),
      listSuppliers(),
      listCustomers(),
      listPaymentMethods(),
    ]);

  // Serialize Prisma objects to plain JSON-safe objects
  // Decimal -> number, Date -> ISO string, strip non-serializable internal fields
  const serializedEntries = result.data.map((entry) => ({
    id: entry.id,
    date: entry.date instanceof Date ? entry.date.toISOString() : String(entry.date),
    dueDate: entry.dueDate
      ? (entry.dueDate instanceof Date ? entry.dueDate.toISOString() : String(entry.dueDate))
      : null,
    competenceDate: entry.competenceDate
      ? (entry.competenceDate instanceof Date ? entry.competenceDate.toISOString() : String(entry.competenceDate))
      : null,
    description: entry.description,
    amount: typeof entry.amount === "object" && entry.amount !== null
      ? Number(entry.amount)
      : Number(entry.amount),
    transactionType: entry.type,
    counterpartName: entry.counterpartName ?? null,
    status: entry.status,
    source: entry.source,
    chartOfAccountId: entry.chartOfAccountId ?? null,
    costCenterId: entry.costCenterId ?? null,
    bankAccountId: entry.bankAccountId ?? null,
    supplierId: entry.supplierId ?? null,
    customerId: entry.customerId ?? null,
    paymentMethodId: entry.paymentMethodId ?? null,
    pendingSettlement: (entry.pendingSettlement as any) ?? null,
    chartOfAccount: entry.chartOfAccount
      ? { code: entry.chartOfAccount.code, name: entry.chartOfAccount.name }
      : null,
    costCenter: entry.costCenter
      ? { code: entry.costCenter.code, name: entry.costCenter.name }
      : null,
    supplier: entry.supplier ? { name: entry.supplier.name } : null,
    customer: entry.customer ? { name: entry.customer.name } : null,
    bankAccount: entry.bankAccount
      ? { bankName: entry.bankAccount.bankName, accountNumber: entry.bankAccount.accountNumber }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staging"
        description="Lancamentos importados aguardando classificacao e incorporacao"
      />
      <StagingClient
        data={serializedEntries}
        statusCounts={statusCounts}
        userRole={user.memberRole}
        activeStatus={params.status ?? "ALL"}
        pagination={{
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        }}
        lookups={{
          chartOfAccounts: chartOfAccounts.map((c) => ({ id: c.id, code: c.code, name: c.name })),
          costCenters: costCenters.map((c) => ({ id: c.id, code: c.code, name: c.name })),
          bankAccounts: bankAccounts.map((b) => ({ id: b.id, bankName: b.bankName, accountNumber: b.accountNumber })),
          suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
          customers: customers.map((c) => ({ id: c.id, name: c.name })),
          paymentMethods: paymentMethods.map((p) => ({ id: p.id, name: p.name })),
        }}
      />
    </div>
  );
}
