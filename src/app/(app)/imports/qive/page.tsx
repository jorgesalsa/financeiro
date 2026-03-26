import { listQiveConnections, listQiveSyncBatches } from "@/lib/actions/qive";
import { PageHeader } from "@/components/layout/page-header";
import { QiveClient } from "./client";

export default async function QivePage() {
  const [connections, batches] = await Promise.all([
    listQiveConnections(),
    listQiveSyncBatches(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="QIVE - Notas Fiscais"
        description="Importe notas fiscais automaticamente do QIVE (Arquivei) via API"
      />
      <QiveClient
        connections={connections as any}
        batches={batches as any}
      />
    </div>
  );
}
