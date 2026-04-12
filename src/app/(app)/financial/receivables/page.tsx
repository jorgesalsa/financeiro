import { listOfficialEntries } from "@/lib/actions/financial";
import { PageHeader } from "@/components/layout/page-header";
import { ReceivablesClient } from "./client";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const statusFilter = params.status && params.status !== "ALL" ? params.status : undefined;

  const result = await listOfficialEntries({
    category: "RECEIVABLE",
    status: statusFilter,
    pagination: { page, pageSize: 50 },
  });

  const serialized = result.data.map((e) => ({
    id: e.id,
    dueDate: e.dueDate ? e.dueDate.toISOString() : null,
    description: e.description,
    amount: Number(e.amount),
    paidAmount: Number(e.paidAmount ?? 0),
    status: e.status,
    customer: e.customer ? { name: e.customer.name } : null,
    chartOfAccount: e.chartOfAccount
      ? { code: e.chartOfAccount.code, name: e.chartOfAccount.name }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description="Lancamentos de contas a receber"
      />
      <ReceivablesClient
        data={serialized}
        pagination={{
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        }}
      />
    </div>
  );
}
