import { listImportBatches } from "@/lib/actions/import";
import { PageHeader } from "@/components/layout/page-header";
import { TaxInvoiceImportClient } from "./client";

export default async function TaxInvoicesPage() {
  const batches = await listImportBatches("TAX_INVOICE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Notas Fiscais"
        description="Importe notas fiscais via CSV, XLSX ou diretamente por arquivo XML de NFe"
      />
      <TaxInvoiceImportClient batches={batches as any} />
    </div>
  );
}
