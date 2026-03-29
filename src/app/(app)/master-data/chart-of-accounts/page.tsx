import { listChartOfAccounts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { ChartOfAccountsClient } from "./client";

export default async function ChartOfAccountsPage() {
  const accounts = await listChartOfAccounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Gerencie o plano de contas da empresa."
      />
      <ChartOfAccountsClient data={accounts} />
    </div>
  );
}
