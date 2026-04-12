"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus } from "@/generated/prisma";

type ReceivableEntry = {
  id: string;
  dueDate: string | null;
  description: string;
  amount: number;
  paidAmount: number;
  status: EntryStatus;
  customer: { name: string } | null;
  chartOfAccount: { code: string; name: string } | null;
};

const columns: ColumnDef<ReceivableEntry>[] = [
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
    id: "customer",
    header: "Cliente",
    accessorFn: (row) => row.customer?.name ?? "",
    cell: ({ row }) => row.original.customer?.name ?? "—",
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
    header: "Recebido",
    cell: ({ row }) => formatCurrency(row.original.paidAmount),
  },
  {
    id: "remaining",
    header: "Saldo",
    accessorFn: (row) => row.amount - row.paidAmount,
    cell: ({ row }) => {
      const remaining = row.original.amount - row.original.paidAmount;
      return (
        <span className={remaining > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
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
];

interface ReceivablesClientProps {
  data: ReceivableEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function ReceivablesClient({ data, pagination }: ReceivablesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigateTo(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/financial/receivables?${params.toString()}`);
  }

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
