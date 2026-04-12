import { listImportBatches } from "@/lib/actions/import";
import { listBankAccounts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { BankStatementImportClient } from "./client";

export default async function BankStatementsPage() {
  const [batches, bankAccounts] = await Promise.all([
    listImportBatches({ type: "BANK_STATEMENT" }),
    listBankAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Extrato Bancário"
        description="Importe extratos em formato OFX, CSV ou TXT"
      />
      <BankStatementImportClient batches={batches.data as any} bankAccounts={bankAccounts as any} />
    </div>
  );
}
