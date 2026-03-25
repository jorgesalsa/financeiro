import { listBankAccounts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { BankAccountsClient } from "./client";

export default async function BankAccountsPage() {
  const bankAccounts = await listBankAccounts();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas Bancárias"
        description="Gerencie as contas bancárias da empresa"
      />
      <BankAccountsClient data={bankAccounts.map((a) => ({
        ...a,
        currentBalance: Number(a.currentBalance),
      }))} />
    </div>
  );
}
