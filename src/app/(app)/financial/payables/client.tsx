"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import { quickPayEntry } from "@/lib/actions/financial";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { EntryStatus } from "@/generated/prisma";

type PayableEntry = {
  id: string;
  dueDate: string | null;
  description: string;
  amount: number;
  paidAmount: number;
  status: EntryStatus;
  supplier: { name: string } | null;
  chartOfAccount: { code: string; name: string } | null;
};

function QuickPayButton({ entryId, onSuccess }: { entryId: string; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleQuickPay() {
    startTransition(async () => {
      try {
        await quickPayEntry(entryId);
        toast({ title: "Pagamento registrado com sucesso!", variant: "success" });
        onSuccess();
      } catch (err: any) {
        toast({ title: err.message ?? "Erro ao registrar pagamento", variant: "error" });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      onClick={handleQuickPay}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      Pagar
    </Button>
  );
}

function buildColumns(onQuickPaySuccess: () => void): ColumnDef<PayableEntry>[] {
  return [
    {
      accessorKey: "dueDate",
      header: "Vencimento",
      cell: ({ row }) =>
        row.original.dueDate ? formatDate(row.original.dueDate) : "—",
    },
    {
      accessorKey: "description",
      header: "Descricao",
    },
    {
      id: "supplier",
      header: "Fornecedor",
      accessorFn: (row) => row.supplier?.name ?? "",
      cell: ({ row }) => row.original.supplier?.name ?? "—",
    },
    {
      id: "chartOfAccount",
      header: "Categoria",
      accessorFn: (row) =>
        row.chartOfAccount ? `${row.chartOfAccount.code} - ${row.chartOfAccount.name}` : "",
      cell: ({ row }) =>
        row.original.chartOfAccount
          ? `${row.original.chartOfAccount.code} - ${row.original.chartOfAccount.name}`
          : "—",
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "paidAmount",
      header: "Pago",
      cell: ({ row }) => formatCurrency(row.original.paidAmount),
    },
    {
      id: "remaining",
      header: "Saldo",
      accessorFn: (row) => row.amount - row.paidAmount,
      cell: ({ row }) => {
        const remaining = row.original.amount - row.original.paidAmount;
        return (
          <span className={remaining > 0 ? "text-red-600 font-medium" : "text-green-600"}>
            {formatCurrency(remaining)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={ENTRY_STATUS_COLORS[row.original.status]}>
          {ENTRY_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
      filterFn: (row, _col, value: string) => {
        const label = ENTRY_STATUS_LABELS[row.original.status] ?? row.original.status;
        return label.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const { status } = row.original;
        if (status === "SETTLED" || status === "CANCELLED") return null;
        return (
          <QuickPayButton
            entryId={row.original.id}
            onSuccess={onQuickPaySuccess}
          />
        );
      },
    },
  ];
}

interface PayablesClientProps {
  data: PayableEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function PayablesClient({ data, pagination }: PayablesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigateTo(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/financial/payables?${params.toString()}`);
  }

  const columns = buildColumns(() => router.refresh());

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="description"
      searchPlaceholder="Buscar por descricao..."
      serverPagination={{
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
        onPageChange: navigateTo,
      }}
    />
  );
}
