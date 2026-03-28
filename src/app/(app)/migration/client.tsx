"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MIGRATION_BATCH_STATUS_LABELS,
  MIGRATION_BATCH_STATUS_COLORS,
  MIGRATION_BATCH_TYPE_LABELS,
} from "@/lib/constants/statuses";
import { formatDateTime } from "@/lib/utils/format";
import type { MigrationBatchStatus, MigrationBatchType } from "@/generated/prisma";
import {
  Plus,
  Download,
  History,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type BatchSummary = {
  id: string;
  name: string;
  type: MigrationBatchType;
  status: MigrationBatchStatus;
  sourceErpName: string | null;
  fileName: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  skippedRows: number;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  itemCount: number;
  errorCount: number;
};

type Stats = {
  total: number;
  inProgress: number;
  pendingApproval: number;
  completed: number;
  failed: number;
};

interface MigrationOverviewClientProps {
  stats: Stats;
  batches: BatchSummary[];
}

export function MigrationOverviewClient({ stats, batches }: MigrationOverviewClientProps) {
  const router = useRouter();

  const statCards = [
    { label: "Total de Lotes", value: stats.total, icon: FileText, color: "text-blue-600" },
    { label: "Em Andamento", value: stats.inProgress, icon: Clock, color: "text-amber-600" },
    { label: "Aguardando Aprovacao", value: stats.pendingApproval, icon: AlertTriangle, color: "text-orange-600" },
    { label: "Concluidos", value: stats.completed, icon: CheckCircle, color: "text-green-600" },
    { label: "Falharam", value: stats.failed, icon: XCircle, color: "text-red-600" },
  ];

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <card.icon className={`h-8 w-8 ${card.color}`} />
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/migration/new")}>
          <Plus className="mr-2 h-4 w-4" /> Nova Migracao
        </Button>
        <Button variant="outline" onClick={() => router.push("/migration/history")}>
          <History className="mr-2 h-4 w-4" /> Historico Completo
        </Button>
      </div>

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lotes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum lote de migracao criado ainda.</p>
              <Button className="mt-4" onClick={() => router.push("/migration/new")}>
                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Lote
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Nome</th>
                    <th className="p-2 text-left font-medium">Tipo</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">ERP Origem</th>
                    <th className="p-2 text-left font-medium">Registros</th>
                    <th className="p-2 text-left font-medium">Criado por</th>
                    <th className="p-2 text-left font-medium">Data</th>
                    <th className="p-2 text-left font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.slice(0, 20).map((batch) => (
                    <tr key={batch.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{batch.name}</td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {MIGRATION_BATCH_TYPE_LABELS[batch.type]}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge className={MIGRATION_BATCH_STATUS_COLORS[batch.status]}>
                          {MIGRATION_BATCH_STATUS_LABELS[batch.status]}
                        </Badge>
                      </td>
                      <td className="p-2">{batch.sourceErpName ?? "\u2014"}</td>
                      <td className="p-2">
                        <span className="tabular-nums">
                          {batch.processedRows}/{batch.totalRows}
                        </span>
                        {batch.errorRows > 0 && (
                          <span className="ml-1 text-red-600">({batch.errorRows} erros)</span>
                        )}
                      </td>
                      <td className="p-2">{batch.createdBy ?? "\u2014"}</td>
                      <td className="p-2">{formatDateTime(batch.createdAt)}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/migration/batches/${batch.id}`)}
                        >
                          Ver Detalhe
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
