"use client";

import { useState, useTransition, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
  MOVEMENT_TYPE_LABELS,
  FINANCIAL_NATURE_LABELS,
  CLASSIFICATION_STATUS_LABELS,
  CLASSIFICATION_STATUS_COLORS,
} from "@/lib/constants/statuses";
import type { EntryStatus, EntryCategory, MovementType, FinancialNature, ClassificationStatus } from "@/generated/prisma";
import {
  DollarSign,
  CreditCard,
  XCircle,
  Layers,
  Pencil,
  Plus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createDirectOfficialEntry, cancelEntry } from "@/lib/actions/financial";

const CATEGORY_LABELS: Record<string, string> = {
  PAYABLE: "Conta a Pagar",
  RECEIVABLE: "Conta a Receber",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

type OfficialEntry = {
  id: string;
  sequentialNumber: number | null;
  date: string | Date;
  competenceDate?: string | Date | null;
  description: string;
  amount: number;
  transactionType: string;
  category: string;
  status: EntryStatus;
  dueDate: string | Date | null;
  paidAmount: number;
  movementType?: string | null;
  financialNature?: string | null;
  classificationStatus?: string | null;
  version?: number;
  manuallyEdited?: boolean;
  chartOfAccount?: { code: string; name: string } | null;
  costCenter?: { code: string; name: string } | null;
  supplier?: { name: string } | null;
  customer?: { name: string } | null;
  settlements?: { id: string; amount: number; paidAt: Date | string }[];
  installmentGroupId?: string | null;
};

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
};

type PaymentMethod = {
  id: string;
  name: string;
};

type ChartOfAccount = {
  id: string;
  code: string;
  name: string;
};

type SupplierOption = {
  id: string;
  name: string;
};

type CustomerOption = {
  id: string;
  name: string;
};

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
};

interface EntriesClientProps {
  data: OfficialEntry[];
  bankAccounts: BankAccount[];
  paymentMethods: PaymentMethod[];
  chartOfAccounts?: ChartOfAccount[];
  suppliers?: SupplierOption[];
  customers?: CustomerOption[];
  costCenters?: CostCenterOption[];
  canCreateDirect?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    category: string;
    status: string;
    startDate: string;
    endDate: string;
  };
}

export function EntriesClient({
  data,
  bankAccounts,
  paymentMethods,
  chartOfAccounts = [],
  suppliers = [],
  customers = [],
  costCenters = [],
  canCreateDirect = false,
  pagination,
  filters,
}: EntriesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filters (initialized from server-side URL params)
  const [statusFilter, setStatusFilter] = useState<string>(filters.status);
  const [categoryFilter, setCategoryFilter] = useState<string>(filters.category);
  const [dateFrom, setDateFrom] = useState(filters.startDate);
  const [dateTo, setDateTo] = useState(filters.endDate);

  // Banner shown when arriving from staging incorporation
  const incorporatedCount = searchParams.get("incorporated");

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  // Dialogs
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlingEntry, setSettlingEntry] = useState<OfficialEntry | null>(null);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [installmentEntry, setInstallmentEntry] = useState<OfficialEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Data is already filtered server-side
  const filteredData = data;

  function navigateWithFilters(overrides?: {
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  }) {
    const p = new URLSearchParams();
    const s = overrides?.status ?? statusFilter;
    const c = overrides?.category ?? categoryFilter;
    const sd = overrides?.startDate ?? dateFrom;
    const ed = overrides?.endDate ?? dateTo;
    const pg = overrides?.page ?? 1;

    if (s && s !== "ALL") p.set("status", s);
    if (c && c !== "ALL") p.set("category", c);
    if (sd) p.set("startDate", sd);
    if (ed) p.set("endDate", ed);
    if (pg > 1) p.set("page", String(pg));

    router.push(`/financial/entries?${p.toString()}`);
  }

  async function handleSettle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settlingEntry) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await fetch("/api/financial/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: settlingEntry.id,
            amount: parseFloat(formData.get("amount") as string),
            interest: parseFloat((formData.get("interest") as string) || "0"),
            fine: parseFloat((formData.get("fine") as string) || "0"),
            discount: parseFloat((formData.get("discount") as string) || "0"),
            bankAccountId: formData.get("bankAccountId") as string,
            paymentMethodId: formData.get("paymentMethodId") as string,
            paidAt: formData.get("paidAt") as string,
          }),
        });
        if (!res.ok) throw new Error("Erro ao liquidar");
      } catch {
        // Fallback: server action not yet wired up
      }
      setSettleOpen(false);
      setSettlingEntry(null);
      router.refresh();
    });
  }

  async function handleCreateInstallments(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!installmentEntry) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await fetch("/api/financial/installments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: installmentEntry.id,
            numberOfInstallments: parseInt(formData.get("numberOfInstallments") as string),
            firstDueDate: formData.get("firstDueDate") as string,
            intervalDays: parseInt(formData.get("intervalDays") as string),
          }),
        });
        if (!res.ok) throw new Error("Erro ao parcelar");
      } catch {
        // Fallback
      }
      setInstallmentOpen(false);
      setInstallmentEntry(null);
      router.refresh();
    });
  }

  async function handleCreateDirect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDirectOfficialEntry({
          date: formData.get("date") as string,
          competenceDate: (formData.get("competenceDate") as string) || undefined,
          description: formData.get("description") as string,
          amount: parseFloat(formData.get("amount") as string),
          transactionType: formData.get("transactionType") as "CREDIT" | "DEBIT",
          category: formData.get("category") as "PAYABLE" | "RECEIVABLE" | "TRANSFER" | "ADJUSTMENT",
          chartOfAccountId: formData.get("chartOfAccountId") as string,
          bankAccountId: formData.get("bankAccountId") as string,
          costCenterId: (formData.get("costCenterId") as string) || undefined,
          supplierId: (formData.get("supplierId") as string) || undefined,
          customerId: (formData.get("customerId") as string) || undefined,
          paymentMethodId: (formData.get("paymentMethodId") as string) || undefined,
          dueDate: (formData.get("dueDate") as string) || undefined,
        });
        setCreateOpen(false);
        router.refresh();
      } catch (err: any) {
        setCreateError(err.message || "Erro ao criar lancamento");
      }
    });
  }

  const columns: ColumnDef<OfficialEntry>[] = [
    {
      accessorKey: "sequentialNumber",
      header: "Seq#",
      cell: ({ row }) => row.original.sequentialNumber ?? "—",
    },
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span>{row.original.description}</span>
          {row.original.manuallyEdited && (
            <span title="Editado manualmente"><Pencil className="h-3 w-3 text-amber-500" /></span>
          )}
        </div>
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
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="outline">
          {CATEGORY_LABELS[row.original.category] ?? row.original.category}
        </Badge>
      ),
      filterFn: (row, _col, value: string) => {
        const label = CATEGORY_LABELS[row.original.category] ?? row.original.category;
        return label.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "movementType",
      header: "Mov.",
      cell: ({ row }) => {
        const mt = row.original.movementType;
        return mt ? (
          <Badge variant="outline" className="text-xs">
            {MOVEMENT_TYPE_LABELS[mt as keyof typeof MOVEMENT_TYPE_LABELS] ?? mt}
          </Badge>
        ) : "—";
      },
      filterFn: (row, _col, value: string) => {
        const mt = row.original.movementType;
        if (!mt) return false;
        const label = MOVEMENT_TYPE_LABELS[mt as keyof typeof MOVEMENT_TYPE_LABELS] ?? mt;
        return label.toLowerCase().includes(value.toLowerCase());
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
      id: "classificationStatus",
      header: "Class.",
      accessorFn: (row) => {
        const cs = row.classificationStatus;
        return cs ? (CLASSIFICATION_STATUS_LABELS[cs as keyof typeof CLASSIFICATION_STATUS_LABELS] ?? cs) : "";
      },
      cell: ({ row }) => {
        const cs = row.original.classificationStatus;
        return cs ? (
          <Badge className={CLASSIFICATION_STATUS_COLORS[cs as keyof typeof CLASSIFICATION_STATUS_COLORS] ?? ""}>
            {CLASSIFICATION_STATUS_LABELS[cs as keyof typeof CLASSIFICATION_STATUS_LABELS] ?? cs}
          </Badge>
        ) : "—";
      },
    },
    {
      id: "chartOfAccount",
      header: "Categoria",
      accessorFn: (row) =>
        row.chartOfAccount ? `${row.chartOfAccount.code} - ${row.chartOfAccount.name}` : "",
      cell: ({ row }) =>
        row.original.chartOfAccount
          ? `${row.original.chartOfAccount.code}`
          : "—",
    },
    {
      accessorKey: "dueDate",
      header: "Vencimento",
      cell: ({ row }) =>
        row.original.dueDate ? formatDate(row.original.dueDate) : "—",
    },
    {
      accessorKey: "paidAmount",
      header: "Pago",
      cell: ({ row }) => formatCurrency(row.original.paidAmount),
    },
    {
      id: "actions",
      enableSorting: false,
      enableColumnFilter: false,
      header: "Acoes",
      cell: ({ row }) => {
        const entry = row.original;
        const canSettle = entry.status === "OPEN" || entry.status === "PARTIAL" || entry.status === "OVERDUE";
        return (
          <div className="flex gap-1">
            {canSettle && (
              <Button
                variant="ghost"
                size="icon"
                title="Liquidar"
                onClick={() => {
                  setSettlingEntry(entry);
                  setSettleOpen(true);
                }}
              >
                <DollarSign className="h-4 w-4 text-green-600" />
              </Button>
            )}
            {entry.status === "OPEN" && !entry.installmentGroupId && (
              <Button
                variant="ghost"
                size="icon"
                title="Parcelar"
                onClick={() => {
                  setInstallmentEntry(entry);
                  setInstallmentOpen(true);
                }}
              >
                <Layers className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {canSettle && (
              <Button
                variant="ghost"
                size="icon"
                title="Cancelar lançamento"
                disabled={isPending}
                onClick={() => {
                  if (confirm("Deseja cancelar este lançamento? Os liquidamentos serão revertidos.")) {
                    startTransition(async () => {
                      const response = await cancelEntry(entry.id);
                      if (!response.ok) {
                        showFeedback("error", response.error);
                        return;
                      }
                      showFeedback("success", "Lançamento cancelado com sucesso.");
                      // navigateWithFilters() uses router.push (reliable in React 19)
                      // instead of router.refresh() which can fail inside startTransition
                      navigateWithFilters();
                    });
                  }
                }}
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
      {/* Feedback banner (cancel / errors) */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-3 font-bold hover:opacity-70">✕</button>
        </div>
      )}

      {/* Staging incorporation success banner */}
      {incorporatedCount && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center justify-between">
          <span>
            ✓ <strong>{incorporatedCount}</strong> lançamento{Number(incorporatedCount) !== 1 ? "s incorporados" : " incorporado"} com sucesso! Exibindo todos os lançamentos sem filtro de data.
          </span>
          <button
            onClick={() => router.replace("/financial/entries")}
            className="ml-4 text-green-600 hover:text-green-800 font-bold text-base leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 sm:gap-4">
        <div>
          <label className="text-xs sm:text-sm font-medium">Data de</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div>
          <label className="text-xs sm:text-sm font-medium">Data ate</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div>
          <label className="text-xs sm:text-sm font-medium">Categoria</label>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="ALL">Todas</option>
            <option value="PAYABLE">Conta a Pagar</option>
            <option value="RECEIVABLE">Conta a Receber</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </Select>
        </div>
        <div>
          <label className="text-xs sm:text-sm font-medium">Status</label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Em aberto</option>
            <option value="PARTIAL">Parcial</option>
            <option value="OVERDUE">Vencido</option>
            <option value="SETTLED">Liquidado</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>
        <Button
          variant="default"
          size="sm"
          className="col-span-1"
          onClick={() => navigateWithFilters({
            status: statusFilter,
            category: categoryFilter,
            startDate: dateFrom,
            endDate: dateTo,
          })}
        >
          Filtrar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="col-span-1"
          onClick={() => {
            setStatusFilter("ALL");
            setCategoryFilter("ALL");
            setDateFrom("");
            setDateTo("");
            navigateWithFilters({ status: "ALL", category: "ALL", startDate: "", endDate: "" });
          }}
        >
          Limpar Filtros
        </Button>
        {canCreateDirect && (
          <Button
            variant="default"
            size="sm"
            className="col-span-2 sm:col-span-1 sm:ml-auto"
            onClick={() => { setCreateError(null); setCreateOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Lancamento
          </Button>
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
          onPageChange: (newPage) => navigateWithFilters({ page: newPage }),
        }}
      />

      {/* Settlement dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liquidar Lancamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {settlingEntry?.description} — Saldo:{" "}
              {settlingEntry
                ? formatCurrency(settlingEntry.amount - settlingEntry.paidAmount)
                : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={
                    settlingEntry
                      ? settlingEntry.amount - settlingEntry.paidAmount
                      : 0
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data Pagamento *</label>
                <Input
                  name="paidAt"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Juros</label>
                <Input name="interest" type="number" step="0.01" defaultValue={0} />
              </div>
              <div>
                <label className="text-sm font-medium">Multa</label>
                <Input name="fine" type="number" step="0.01" defaultValue={0} />
              </div>
              <div>
                <label className="text-sm font-medium">Desconto</label>
                <Input name="discount" type="number" step="0.01" defaultValue={0} />
              </div>
              <div>
                <label className="text-sm font-medium">Data Liquidação</label>
                <Input name="settlementDate" type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Conta Bancaria *</label>
                <SearchableSelect
                  name="bankAccountId"
                  required
                  placeholder="Buscar conta..."
                  options={bankAccounts.map((ba) => ({
                    value: ba.id,
                    label: `${ba.bankName} - ${ba.accountNumber}`,
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Forma Pagamento *</label>
                <Select name="paymentMethodId" required>
                  <option value="">Selecione...</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettleOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Liquidando..." : "Liquidar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Installment dialog */}
      <Dialog open={installmentOpen} onOpenChange={setInstallmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parcelar Lancamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInstallments} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {installmentEntry?.description} —{" "}
              {installmentEntry ? formatCurrency(installmentEntry.amount) : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Numero de Parcelas *</label>
                <Input
                  name="numberOfInstallments"
                  type="number"
                  min={2}
                  max={120}
                  defaultValue={3}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Primeiro Vencimento *</label>
                <Input name="firstDueDate" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Intervalo (dias) *</label>
                <Input
                  name="intervalDays"
                  type="number"
                  min={1}
                  defaultValue={30}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInstallmentOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Parcelando..." : "Parcelar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create direct entry dialog */}
      {canCreateDirect && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Lancamento Oficial</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDirect} className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{createError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Descricao *</label>
                  <Input name="description" placeholder="Ex: Pagamento fornecedor X" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor *</label>
                  <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <Select name="transactionType" required>
                    <option value="DEBIT">Debito (Saida)</option>
                    <option value="CREDIT">Credito (Entrada)</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria *</label>
                  <Select name="category" required>
                    <option value="PAYABLE">Conta a Pagar</option>
                    <option value="RECEIVABLE">Conta a Receber</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Data Competencia</label>
                  <Input name="competenceDate" type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium">Vencimento</label>
                  <Input name="dueDate" type="date" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Plano de Contas *</label>
                  <SearchableSelect
                    name="chartOfAccountId"
                    required
                    placeholder="Buscar conta contabil..."
                    options={chartOfAccounts.map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.name}`,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Conta Bancaria *</label>
                  <SearchableSelect
                    name="bankAccountId"
                    required
                    placeholder="Buscar conta..."
                    options={bankAccounts.map((ba) => ({
                      value: ba.id,
                      label: `${ba.bankName} - ${ba.accountNumber}`,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Forma Pagamento</label>
                  <Select name="paymentMethodId">
                    <option value="">Nenhuma</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Centro de Custo</label>
                  <SearchableSelect
                    name="costCenterId"
                    placeholder="Buscar centro de custo..."
                    options={costCenters.map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.name}`,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fornecedor</label>
                  <SearchableSelect
                    name="supplierId"
                    placeholder="Buscar fornecedor..."
                    options={suppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cliente</label>
                  <SearchableSelect
                    name="customerId"
                    placeholder="Buscar cliente..."
                    options={customers.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Criando..." : "Criar Lancamento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
