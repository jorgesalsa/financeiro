import { listOfficialEntries } from "@/lib/actions/financial";
import { PageHeader } from "@/components/layout/page-header";
import { listBankAccounts, listPaymentMethods } from "@/lib/actions/master-data";
import { EntriesClient } from "./client";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const [result, bankAccounts, paymentMethods] = await Promise.all([
    listOfficialEntries({
      category: params.category,
      status: params.status,
      startDate: params.startDate,
      endDate: params.endDate,
      pagination: { page, pageSize: 50 },
    }),
    listBankAccounts(),
    listPaymentMethods(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lancamentos Oficiais"
        description="Gerencie todos os lancamentos financeiros"
      />
      <EntriesClient
        data={result.data as any[]}
        bankAccounts={bankAccounts as any[]}
        paymentMethods={paymentMethods as any[]}
        pagination={{
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        }}
        filters={{
          category: params.category ?? "ALL",
          status: params.status ?? "ALL",
          startDate: params.startDate ?? "",
          endDate: params.endDate ?? "",
        }}
      />
    </div>
  );
}
