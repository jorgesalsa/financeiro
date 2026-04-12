import { listOfficialEntries } from "@/lib/actions/financial";
import { PageHeader } from "@/components/layout/page-header";
import { PayablesClient } from "./client";

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const statusFilter = params.status && params.status !== "ALL" ? params.status : undefined;

  const result = await listOfficialEntries({
    category: "PAYABLE",
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
    supplier: e.supplier ? { name: e.supplier.name } : null,
    chartOfAccount: e.chartOfAccount
      ? { code: e.chartOfAccount.code, name: e.chartOfAccount.name }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Lancamentos de contas a pagar"
      />
      <PayablesClient
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
