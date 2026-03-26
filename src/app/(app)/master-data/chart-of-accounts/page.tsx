import { listChartOfAccounts, listChartTemplates } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { ChartOfAccountsClient } from "./client";

export default async function ChartOfAccountsPage() {
  const [accounts, templates] = await Promise.all([
    listChartOfAccounts(),
    listChartTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Gerencie o plano de contas da empresa. Use um modelo pré-definido ou crie manualmente."
      />
      <ChartOfAccountsClient data={accounts} templates={templates} />
    </div>
  );
}
