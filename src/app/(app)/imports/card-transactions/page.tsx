import { listImportBatches } from "@/lib/actions/import";
import { PageHeader } from "@/components/layout/page-header";
import { CardTransactionImportClient } from "./client";

export default async function CardTransactionsPage() {
  const batches = await listImportBatches({ type: "CARD_TRANSACTION" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Transações de Cartão"
        description="Importe transações de cartão em formato CSV, TXT ou XLSX"
      />
      <CardTransactionImportClient batches={batches.data as any} />
    </div>
  );
}
