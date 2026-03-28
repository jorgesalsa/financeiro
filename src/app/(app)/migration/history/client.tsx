"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  MIGRATION_BATCH_STATUS_LABELS,
  MIGRATION_BATCH_STATUS_COLORS,
  MIGRATION_BATCH_TYPE_LABELS,
} from "@/lib/constants/statuses";
import { formatDateTime } from "@/lib/utils/format";
import type { MigrationBatchStatus, MigrationBatchType } from "@/generated/prisma";
import { Eye, ArrowLeft } from "lucide-react";

type BatchRow = {
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

interface MigrationHistoryClientProps {
  batches: BatchRow[];
}

export function MigrationHistoryClient({ batches }: MigrationHistoryClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filteredData = useMemo(() => {
    return batches.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && b.type !== typeFilter) return false;
      return true;
    });
  }, [batches, statusFilter, typeFilter]);

  const columns: ColumnDef<BatchRow>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="outline">
          {MIGRATION_BATCH_TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={MIGRATION_BATCH_STATUS_COLORS[row.original.status]}>
          {MIGRATION_BATCH_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "sourceErpName",
      header: "ERP Origem",
      cell: ({ row }) => row.original.sourceErpName ?? "\u2014",
    },
    {
      accessorKey: "fileName",
      header: "Arquivo",
      cell: ({ row }) => row.original.fileName ?? "\u2014",
    },
    {
      id: "progress",
      header: "Progresso",
      cell: ({ row }) => {
        const b = row.original;
        if (b.totalRows === 0) return "\u2014";
        const pct = b.totalRows > 0 ? Math.round((b.processedRows / b.totalRows) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums">
              {b.processedRows}/{b.totalRows}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "errorRows",
      header: "Erros",
      cell: ({ row }) =>
        row.original.errorRows > 0 ? (
          <Badge variant="destructive">{row.original.errorRows}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      accessorKey: "createdBy",
      header: "Criado por",
      cell: ({ row }) => row.original.createdBy ?? "\u2014",
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Acoes",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/migration/batches/${row.original.id}`)}
          title="Ver detalhe"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/migration")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div>
          <label className="text-xs font-medium">Tipo</label>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-40"
          >
            <option value="ALL">Todos</option>
            <option value="FULL_INITIAL_LOAD">Carga Inicial</option>
            <option value="MODULE_IMPORT">Por Modulo</option>
            <option value="MASS_UPDATE">Atualizacao</option>
            <option value="REIMPORT">Reimportacao</option>
            <option value="EXPORT">Exportacao</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium">Status</label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-44"
          >
            <option value="ALL">Todos</option>
            <option value="DRAFT">Rascunho</option>
            <option value="UPLOADED">Enviado</option>
            <option value="MAPPED">Mapeado</option>
            <option value="VALIDATED">Validado</option>
            <option value="PENDING_APPROVAL">Aguardando Aprovacao</option>
            <option value="APPROVED">Aprovado</option>
            <option value="PROCESSING">Processando</option>
            <option value="COMPLETED">Concluido</option>
            <option value="COMPLETED_PARTIAL">Parcial</option>
            <option value="FAILED">Falhou</option>
            <option value="ROLLED_BACK">Desfeito</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatusFilter("ALL");
            setTypeFilter("ALL");
          }}
        >
          Limpar
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="name"
        searchPlaceholder="Buscar lote..."
      />
    </>
  );
}
