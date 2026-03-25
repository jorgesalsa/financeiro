import { PageHeader } from "@/components/layout/page-header";
import { listPluggyConnections, listPluggySyncBatches } from "@/lib/actions/pluggy";
import { listBankAccounts } from "@/lib/actions/master-data";
import { PluggyConnectionsClient } from "./client";

export default async function PluggyPage() {
  const [connections, bankAccounts, syncBatches] = await Promise.all([
    listPluggyConnections(),
    listBankAccounts(),
    listPluggySyncBatches(),
  ]);

  // Serialize bank accounts (Decimal → number)
  const serializedBankAccounts = bankAccounts.map((ba) => ({
    id: ba.id,
    bankName: ba.bankName,
    bankCode: ba.bankCode,
    agency: ba.agency,
    accountNumber: ba.accountNumber,
    accountType: ba.accountType,
    active: ba.active,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexoes Bancarias"
        description="Conecte suas contas bancarias via Open Banking (Pluggy) para importacao automatica de extratos"
      />
      <PluggyConnectionsClient
        connections={connections}
        bankAccounts={serializedBankAccounts}
        syncBatches={syncBatches}
      />
    </div>
  );
}
