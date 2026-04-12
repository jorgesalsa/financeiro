import { listInternalTransfers } from "@/lib/actions/transfer";
import { listBankAccounts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import TransfersClient from "./client";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const [result, bankAccounts] = await Promise.all([
    listInternalTransfers({ pagination: { page, pageSize: 50 } }),
    listBankAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferências Internas"
        description="Transferências entre contas bancárias da empresa"
      />
      <TransfersClient
        transfers={JSON.parse(JSON.stringify(result.data))}
        bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
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
