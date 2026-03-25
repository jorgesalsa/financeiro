import { listStagingEntries } from "@/lib/actions/staging";
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

export default async function StagingPage() {
  const [entries, user, chartOfAccounts, costCenters, bankAccounts, suppliers, customers, paymentMethods] =
    await Promise.all([
      listStagingEntries(),
      getCurrentUser(),
      listChartOfAccounts(),
      listCostCenters(),
      listBankAccounts(),
      listSuppliers(),
      listCustomers(),
      listPaymentMethods(),
    ]);

  const counts: Record<string, number> = {
    ALL: entries.length,
    PENDING: 0,
    AUTO_CLASSIFIED: 0,
    VALIDATED: 0,
    INCORPORATED: 0,
    REJECTED: 0,
  };

  // Serialize Prisma objects to plain JSON-safe objects
  // Decimal → number, Date → ISO string, strip non-serializable internal fields
  const serializedEntries = entries.map((entry) => ({
    id: entry.id,
    date: entry.date instanceof Date ? entry.date.toISOString() : String(entry.date),
    description: entry.description,
    amount: typeof entry.amount === "object" && entry.amount !== null
      ? Number(entry.amount)
      : Number(entry.amount),
    transactionType: entry.type,
    counterpartName: entry.counterpartName ?? null,
    status: entry.status,
    chartOfAccountId: entry.chartOfAccountId ?? null,
    costCenterId: entry.costCenterId ?? null,
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

  for (const entry of serializedEntries) {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staging"
        description="Lançamentos importados aguardando classificação e incorporação"
      />
      <StagingClient
        data={serializedEntries}
        statusCounts={counts}
        userRole={user.memberRole}
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
