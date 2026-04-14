"use client";

import { useState, useTransition, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createStagingEntry,
  updateStagingEntry,
  validateEntries,
  rejectStagingEntry,
  incorporateEntries,
} from "@/lib/actions/staging";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  STAGING_STATUS_LABELS,
  STAGING_STATUS_COLORS,
  STAGING_SOURCE_LABELS,
} from "@/lib/constants/statuses";
import { hasMinRole } from "@/lib/constants/roles";
import type { Role, StagingStatus, StagingSource } from "@/generated/prisma";
import {
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";

type StagingEntry = {
  id: string;
  date: string;
  dueDate: string | null;
  competenceDate: string | null;
  description: string;
  amount: number;
  transactionType: string;
  counterpartName: string | null;
  status: StagingStatus;
  source: StagingSource;
  chartOfAccount: { code: string; name: string } | null;
  costCenter: { code: string; name: string } | null;
  supplier: { name: string } | null;
  customer: { name: string } | null;
  bankAccount: { bankName: string; accountNumber: string } | null;
  chartOfAccountId: string | null;
  costCenterId: string | null;
  bankAccountId: string | null;
  // Approval / rejection info
  rejectionReason: string | null;
  validatedAt: string | Date | null;
  validatedBy: { name: string | null; email: string } | null;
  supplierId: string | null;
  customerId: string | null;
  paymentMethodId: string | null;
  pendingSettlement: {
    amount: number;
    interestAmount: number;
    fineAmount: number;
    discountAmount: number;
    date: string;
    bankAccountId: string;
    paymentMethodId: string | null;
  } | null;
};

type Lookups = {
  chartOfAccounts: { id: string; code: string; name: string }[];
  costCenters: { id: string; code: string; name: string }[];
  bankAccounts: { id: string; bankName: string; accountNumber: string }[];
  suppliers: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  paymentMethods: { id: string; name: string }[];
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendentes" },
  { key: "PARSED", label: "Parseados" },
  { key: "NORMALIZED", label: "Normalizados" },
  { key: "AUTO_CLASSIFIED", label: "Auto-classificados" },
  { key: "CONFLICT", label: "Conflitos" },
  { key: "VALIDATED", label: "Validados" },
  { key: "INCORPORATED", label: "Incorporados" },
  { key: "REJECTED", label: "Rejeitados" },
];

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

interface StagingClientProps {
  data: StagingEntry[];
  statusCounts: Record<string, number>;
  userRole: Role;
  lookups: Lookups;
  activeStatus: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function StagingClient({ data, statusCounts, userRole, lookups, activeStatus, pagination }: StagingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StagingEntry | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createIsPaid, setCreateIsPaid] = useState(false);
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  // Data is already filtered server-side; use directly
  const filteredData = data;

  function navigateTo(newStatus?: string, newPage?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus !== undefined) {
      if (newStatus === "ALL") {
        params.delete("status");
      } else {
        params.set("status", newStatus);
      }
      // Reset to page 1 when changing status filter
      params.delete("page");
    }
    if (newPage !== undefined && newPage > 1) {
      params.set("page", String(newPage));
    } else if (newPage !== undefined) {
      params.delete("page");
    }
    router.push(`/staging?${params.toString()}`);
  }

  const canIncorporate = hasMinRole(userRole, "CONTROLLER");

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((e) => e.id)));
    }
  }

  async function handleValidateSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const response = await validateEntries(ids);
      if (!response.ok) {
        showFeedback("error", response.error);
        return;
      }
      const failed = response.results.filter((r) => !r.valid);
      if (failed.length > 0) {
        const allErrors = failed.flatMap((f) => f.errors);
        showFeedback("error", `Validacao falhou: ${allErrors.join(", ")}`);
      } else {
        showFeedback("success", `${response.results.length} lancamento(s) validado(s) com sucesso!`);
      }
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  async function handleValidateSingle(id: string) {
    startTransition(async () => {
      const response = await validateEntries([id]);
      if (!response.ok) {
        showFeedback("error", response.error);
        return;
      }
      const result = response.results[0];
      if (!result.valid) {
        showFeedback("error", `Validacao falhou: ${result.errors.join(", ")}`);
      } else {
        showFeedback("success", "Lancamento validado com sucesso!");
      }
      router.refresh();
    });
  }

  async function handleIncorporateSelected() {
    const ids = Array.from(selectedIds).filter((id) => {
      const entry = data.find((e) => e.id === id);
      return entry?.status === "VALIDATED";
    });
    if (ids.length === 0) {
      showFeedback("error", "Selecione lancamentos com status 'Validado' para incorporar");
      return;
    }
    startTransition(async () => {
      const response = await incorporateEntries(ids);
      if (!response.ok) {
        showFeedback("error", response.error);
        return;
      }
      setSelectedIds(new Set());
      // Navigate to official entries without date filters so all incorporated entries are visible
      router.push(`/financial/entries?incorporated=${response.results.length}`);
    });
  }

  async function handleReject() {
    if (!rejectingId || !rejectReason.trim()) return;
    startTransition(async () => {
      const response = await rejectStagingEntry(rejectingId, rejectReason);
      if (!response.ok) {
        showFeedback("error", response.error);
        return;
      }
      showFeedback("success", "Lancamento rejeitado");
      setRejectOpen(false);
      setRejectingId(null);
      setRejectReason("");
      router.refresh();
    });
  }

  function buildSettlementData(formData: FormData) {
    return {
      amount: parseFloat(formData.get("settlement_amount") as string),
      interestAmount: parseFloat(formData.get("settlement_interest") as string) || 0,
      fineAmount: parseFloat(formData.get("settlement_fine") as string) || 0,
      discountAmount: parseFloat(formData.get("settlement_discount") as string) || 0,
      date: formData.get("settlement_date") as string,
      bankAccountId: formData.get("settlement_bankAccountId") as string,
      paymentMethodId: (formData.get("settlement_paymentMethodId") as string) || null,
    };
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dueDateVal = formData.get("dueDate") as string;
    const compDateVal = formData.get("competenceDate") as string;

    startTransition(async () => {
      try {
        await createStagingEntry({
          date: new Date(formData.get("date") as string),
          dueDate: dueDateVal ? new Date(dueDateVal) : null,
          competenceDate: compDateVal ? new Date(compDateVal) : null,
          description: formData.get("description") as string,
          amount: parseFloat(formData.get("amount") as string),
          type: formData.get("transactionType") as "CREDIT" | "DEBIT",
          counterpartName: (formData.get("counterpartName") as string) || null,
          chartOfAccountId: (formData.get("chartOfAccountId") as string) || null,
          costCenterId: (formData.get("costCenterId") as string) || null,
          bankAccountId: (formData.get("bankAccountId") as string) || null,
          supplierId: (formData.get("supplierId") as string) || null,
          customerId: (formData.get("customerId") as string) || null,
          paymentMethodId: (formData.get("paymentMethodId") as string) || null,
          notes: (formData.get("notes") as string) || null,
          pendingSettlement: createIsPaid ? buildSettlementData(formData) : null,
        });
        showFeedback("success", "Lancamento criado com sucesso!");
        setCreateOpen(false);
        setCreateIsPaid(false);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao criar lancamento");
      }
    });
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const formData = new FormData(e.currentTarget);
    const dueDateVal = formData.get("dueDate") as string;
    const compDateVal = formData.get("competenceDate") as string;

    startTransition(async () => {
      try {
        await updateStagingEntry(editing.id, {
          date: new Date(formData.get("date") as string),
          dueDate: dueDateVal ? new Date(dueDateVal) : null,
          competenceDate: compDateVal ? new Date(compDateVal) : null,
          description: formData.get("description") as string,
          amount: parseFloat(formData.get("amount") as string),
          type: formData.get("transactionType") as "CREDIT" | "DEBIT",
          counterpartName: (formData.get("counterpartName") as string) || null,
          chartOfAccountId: (formData.get("chartOfAccountId") as string) || null,
          costCenterId: (formData.get("costCenterId") as string) || null,
          bankAccountId: (formData.get("bankAccountId") as string) || null,
          supplierId: (formData.get("supplierId") as string) || null,
          customerId: (formData.get("customerId") as string) || null,
          paymentMethodId: (formData.get("paymentMethodId") as string) || null,
          notes: (formData.get("notes") as string) || null,
          pendingSettlement: editIsPaid ? buildSettlementData(formData) : null,
        });
        showFeedback("success", "Lancamento atualizado com sucesso!");
        setEditOpen(false);
        setEditing(null);
        setEditIsPaid(false);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao atualizar lancamento");
      }
    });
  }

  const columns: ColumnDef<StagingEntry>[] = [
    {
      id: "select",
      enableSorting: false,
      enableColumnFilter: false,
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === filteredData.length && filteredData.length > 0}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
    },
    {
      accessorKey: "date",
      header: "Emissao",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "dueDate",
      header: "Vencimento",
      cell: ({ row }) =>
        row.original.dueDate ? formatDate(row.original.dueDate) : "—",
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => (
        <span className="block max-w-[200px] truncate" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "transactionType",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.transactionType === "CREDIT" ? "text-green-700 border-green-200" : "text-red-700 border-red-200"}>
          {row.original.transactionType === "CREDIT" ? "A Receber" : "A Pagar"}
        </Badge>
      ),
      filterFn: (row, _col, value: string) => {
        const label = row.original.transactionType === "CREDIT" ? "A Receber" : "A Pagar";
        return label.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      id: "fornecedorCliente",
      header: "Fornecedor / Cliente",
      accessorFn: (row) =>
        row.supplier?.name ?? row.customer?.name ?? row.counterpartName ?? "",
      cell: ({ row }) =>
        row.original.supplier?.name ??
        row.original.customer?.name ??
        row.original.counterpartName ??
        "—",
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
      id: "costCenter",
      header: "Centro de Custo",
      accessorFn: (row) =>
        row.costCenter ? `${row.costCenter.code} - ${row.costCenter.name}` : "",
      cell: ({ row }) =>
        row.original.costCenter
          ? `${row.original.costCenter.code} - ${row.original.costCenter.name}`
          : "—",
    },
    {
      id: "pago",
      header: "Pago",
      enableColumnFilter: false,
      cell: ({ row }) =>
        row.original.pendingSettlement ? (
          <Badge className="bg-green-100 text-green-800">Sim</Badge>
        ) : null,
    },
    {
      accessorKey: "source",
      header: "Origem",
      cell: ({ row }) => (
        <Badge variant="outline">
          {STAGING_SOURCE_LABELS[row.original.source] ?? row.original.source}
        </Badge>
      ),
      filterFn: (row, _col, value: string) => {
        const label = STAGING_SOURCE_LABELS[row.original.source] ?? row.original.source;
        return label.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const entry = row.original;
        const badge = (
          <Badge className={STAGING_STATUS_COLORS[entry.status]}>
            {STAGING_STATUS_LABELS[entry.status]}
          </Badge>
        );
        // Show rejection reason below the badge
        if (entry.status === "REJECTED" && entry.rejectionReason) {
          return (
            <div className="flex flex-col gap-0.5">
              {badge}
              <span
                className="text-xs text-red-600 max-w-[180px] truncate"
                title={entry.rejectionReason}
              >
                {entry.rejectionReason}
              </span>
            </div>
          );
        }
        // Show who validated below the badge
        if (
          (entry.status === "VALIDATED" || entry.status === "INCORPORATED") &&
          entry.validatedBy
        ) {
          return (
            <div className="flex flex-col gap-0.5">
              {badge}
              <span className="text-xs text-muted-foreground">
                {entry.validatedBy.name ?? entry.validatedBy.email}
              </span>
            </div>
          );
        }
        return badge;
      },
      filterFn: (row, _col, value: string) => {
        const label = STAGING_STATUS_LABELS[row.original.status] ?? row.original.status;
        return label.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableColumnFilter: false,
      header: "Acoes",
      cell: ({ row }) => {
        const entry = row.original;
        const canEdit = ["PENDING", "PARSED", "NORMALIZED", "AUTO_CLASSIFIED", "CONFLICT"].includes(entry.status);
        return (
          <div className="flex gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(entry);
                  setEditIsPaid(!!entry.pendingSettlement);
                  setEditOpen(true);
                }}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleValidateSingle(entry.id)}
                title="Validar"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRejectingId(entry.id);
                  setRejectOpen(true);
                }}
                title="Rejeitar"
              >
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
          <button
            onClick={() => setFeedback(null)}
            className="ml-3 font-bold hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeStatus === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => navigateTo(tab.key)}
          >
            {tab.label}
            <Badge variant="secondary" className="ml-2">
              {statusCounts[tab.key] ?? 0}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            setCreateIsPaid(false);
            setCreateOpen(true);
          }}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Lancamento
        </Button>
        {selectedIds.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateSelected}
              disabled={isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Validar Selecionados ({selectedIds.size})
            </Button>
            {canIncorporate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleIncorporateSelected}
                disabled={isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Incorporar Selecionados
              </Button>
            )}
          </>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="description"
        searchPlaceholder="Buscar lancamento..."
        serverPagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => navigateTo(undefined, newPage),
        }}
      />

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lancamento Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Dates */}
              <div>
                <label className="text-sm font-medium">Data de Emissao *</label>
                <Input name="date" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Data de Vencimento *</label>
                <Input name="dueDate" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Data de Entrada</label>
                <Input name="competenceDate" type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <select name="transactionType" required className={selectClass}>
                  <option value="DEBIT">Conta a Pagar</option>
                  <option value="CREDIT">Conta a Receber</option>
                </select>
              </div>

              {/* Description + Amount */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Descricao *</label>
                <Input name="description" required />
              </div>
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input name="amount" type="number" step="0.01" required />
              </div>

              {/* Lookups */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Categoria</label>
                <select name="chartOfAccountId" className={selectClass}>
                  <option value="">Selecione...</option>
                  {lookups.chartOfAccounts.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Centro de Custo</label>
                <select name="costCenterId" className={selectClass}>
                  <option value="">Selecione...</option>
                  {lookups.costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta Bancaria</label>
                <SearchableSelect
                  name="bankAccountId"
                  placeholder="Buscar conta..."
                  options={lookups.bankAccounts.map((b) => ({
                    value: b.id,
                    label: `${b.bankName} - ${b.accountNumber}`,
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fornecedor</label>
                <select name="supplierId" className={selectClass}>
                  <option value="">Selecione...</option>
                  {lookups.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <select name="customerId" className={selectClass}>
                  <option value="">Selecione...</option>
                  {lookups.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <select name="paymentMethodId" className={selectClass}>
                  <option value="">Selecione...</option>
                  {lookups.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Observacoes</label>
                <Input name="notes" placeholder="Notas adicionais..." />
              </div>

              {/* ── Pago toggle ── */}
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createIsPaid}
                    onChange={(e) => setCreateIsPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Marcar como Pago</span>
                </label>
              </div>

              {createIsPaid && (
                <>
                  <div>
                    <label className="text-sm font-medium">Valor da Baixa *</label>
                    <Input name="settlement_amount" type="number" step="0.01" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Pagamento *</label>
                    <Input name="settlement_date" type="date" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Juros</label>
                    <Input name="settlement_interest" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Multa</label>
                    <Input name="settlement_fine" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Desconto</label>
                    <Input name="settlement_discount" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conta Bancaria (Pgto) *</label>
                    <SearchableSelect
                      name="settlement_bankAccountId"
                      required
                      placeholder="Buscar conta..."
                      options={lookups.bankAccounts.map((b) => ({
                        value: b.id,
                        label: `${b.bankName} - ${b.accountNumber}`,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Forma de Pagamento (Pgto)</label>
                    <select name="settlement_paymentMethodId" className={selectClass}>
                      <option value="">Selecione...</option>
                      {lookups.paymentMethods.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lancamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Dates */}
              <div>
                <label className="text-sm font-medium">Data de Emissao *</label>
                <Input
                  name="date"
                  type="date"
                  defaultValue={
                    editing ? new Date(editing.date).toISOString().split("T")[0] : ""
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data de Vencimento *</label>
                <Input
                  name="dueDate"
                  type="date"
                  defaultValue={
                    editing?.dueDate
                      ? new Date(editing.dueDate).toISOString().split("T")[0]
                      : ""
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data de Entrada</label>
                <Input
                  name="competenceDate"
                  type="date"
                  defaultValue={
                    editing?.competenceDate
                      ? new Date(editing.competenceDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  name="transactionType"
                  defaultValue={editing?.transactionType ?? "DEBIT"}
                  required
                  className={selectClass}
                >
                  <option value="DEBIT">Conta a Pagar</option>
                  <option value="CREDIT">Conta a Receber</option>
                </select>
              </div>

              {/* Description + Amount */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Descricao *</label>
                <Input name="description" defaultValue={editing?.description ?? ""} required />
              </div>
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.amount ?? 0}
                  required
                />
              </div>

              {/* Lookups */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Categoria</label>
                <select
                  name="chartOfAccountId"
                  defaultValue={editing?.chartOfAccountId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {lookups.chartOfAccounts.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Centro de Custo</label>
                <select
                  name="costCenterId"
                  defaultValue={editing?.costCenterId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {lookups.costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta Bancaria</label>
                <SearchableSelect
                  name="bankAccountId"
                  defaultValue={editing?.bankAccountId ?? ""}
                  placeholder="Buscar conta..."
                  options={lookups.bankAccounts.map((b) => ({
                    value: b.id,
                    label: `${b.bankName} - ${b.accountNumber}`,
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fornecedor</label>
                <select
                  name="supplierId"
                  defaultValue={editing?.supplierId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {lookups.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <select
                  name="customerId"
                  defaultValue={editing?.customerId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {lookups.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <select
                  name="paymentMethodId"
                  defaultValue={editing?.paymentMethodId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {lookups.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Observacoes</label>
                <Input name="notes" placeholder="Notas adicionais..." />
              </div>

              {/* ── Pago toggle ── */}
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsPaid}
                    onChange={(e) => setEditIsPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Marcar como Pago</span>
                </label>
              </div>

              {editIsPaid && (
                <>
                  <div>
                    <label className="text-sm font-medium">Valor da Baixa *</label>
                    <Input
                      name="settlement_amount"
                      type="number"
                      step="0.01"
                      defaultValue={editing?.pendingSettlement?.amount ?? editing?.amount ?? 0}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Pagamento *</label>
                    <Input
                      name="settlement_date"
                      type="date"
                      defaultValue={editing?.pendingSettlement?.date ?? ""}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Juros</label>
                    <Input
                      name="settlement_interest"
                      type="number"
                      step="0.01"
                      defaultValue={editing?.pendingSettlement?.interestAmount ?? 0}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Multa</label>
                    <Input
                      name="settlement_fine"
                      type="number"
                      step="0.01"
                      defaultValue={editing?.pendingSettlement?.fineAmount ?? 0}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Desconto</label>
                    <Input
                      name="settlement_discount"
                      type="number"
                      step="0.01"
                      defaultValue={editing?.pendingSettlement?.discountAmount ?? 0}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conta Bancaria (Pgto) *</label>
                    <SearchableSelect
                      name="settlement_bankAccountId"
                      defaultValue={editing?.pendingSettlement?.bankAccountId ?? ""}
                      required
                      placeholder="Buscar conta..."
                      options={lookups.bankAccounts.map((b) => ({
                        value: b.id,
                        label: `${b.bankName} - ${b.accountNumber}`,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Forma de Pagamento (Pgto)</label>
                    <select
                      name="settlement_paymentMethodId"
                      defaultValue={editing?.pendingSettlement?.paymentMethodId ?? ""}
                      className={selectClass}
                    >
                      <option value="">Selecione...</option>
                      {lookups.paymentMethods.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Lancamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da rejeicao *</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Informe o motivo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !rejectReason.trim()}
            >
              {isPending ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
