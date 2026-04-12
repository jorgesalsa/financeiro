import { listImportBatches } from "@/lib/actions/import";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseInvoiceImportClient } from "./client";

export default async function PurchaseInvoicesPage() {
  const batches = await listImportBatches({ type: "PURCHASE_INVOICE" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Notas de Compra"
        description="Importe notas fiscais de compra em formato CSV, TXT ou XLSX"
      />
      <PurchaseInvoiceImportClient batches={batches.data as any} />
    </div>
  );
}
