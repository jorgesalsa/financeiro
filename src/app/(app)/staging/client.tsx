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
} from "@/lib/constants/statuses";
import { hasMinRole } from "@/lib/constants/roles";
import type { Role, StagingStatus } from "@/generated/prisma";
import {
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

type StagingEntry = {
  id: string;
  date: string;           // ISO string (serialized from Date)
  description: string;
  amount: number;          // serialized from Decimal
  transactionType: string;
  counterpartName: string | null;
  status: StagingStatus;
  chartOfAccount: { code: string; name: string } | null;
  costCenter: { code: string; name: string } | null;
  supplier: { name: string } | null;
  customer: { name: string } | null;
  bankAccount: { bankName: string; accountNumber: string } | null;
  chartOfAccountId: string | null;
  costCenterId: string | null;
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
  { key: "AUTO_CLASSIFIED", label: "Auto-classificados" },
  { key: "VALIDATED", label: "Validados" },
  { key: "INCORPORATED", label: "Incorporados" },
  { key: "REJECTED", label: "Rejeitados" },
];

interface StagingClientProps {
  data: StagingEntry[];
  statusCounts: Record<string, number>;
  userRole: Role;
  lookups: Lookups;
}

export function StagingClient({ data, statusCounts, userRole, lookups }: StagingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StagingEntry | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (activeTab === "ALL") return data;
    return data.filter((e) => e.status === activeTab);
  }, [data, activeTab]);

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
      await validateEntries(ids);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  async function handleIncorporateSelected() {
    const ids = Array.from(selectedIds).filter((id) => {
      const entry = data.find((e) => e.id === id);
      return entry?.status === "VALIDATED";
    });
    if (ids.length === 0) return;
    startTransition(async () => {
      await incorporateEntries(ids);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  async function handleReject() {
    if (!rejectingId || !rejectReason.trim()) return;
    startTransition(async () => {
      await rejectStagingEntry(rejectingId, rejectReason);
      setRejectOpen(false);
      setRejectingId(null);
      setRejectReason("");
      router.refresh();
    });
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createStagingEntry({
        date: new Date(formData.get("date") as string),
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
      });
      setCreateOpen(false);
      router.refresh();
    });
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateStagingEntry(editing.id, {
        date: new Date(formData.get("date") as string),
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
      });
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    });
  }

  const columns: ColumnDef<StagingEntry>[] = [
    {
      id: "select",
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
      header: "Data",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "description",
      header: "Descricao",
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
        <Badge variant="outline">
          {row.original.transactionType === "CREDIT" ? "C" : "D"}
        </Badge>
      ),
    },
    {
      accessorKey: "counterpartName",
      header: "Contrapartida",
      cell: ({ row }) =>
        row.original.supplier?.name ??
        row.original.customer?.name ??
        row.original.counterpartName ??
        "—",
    },
    {
      id: "chartOfAccount",
      header: "Conta Contabil",
      cell: ({ row }) =>
        row.original.chartOfAccount
          ? `${row.original.chartOfAccount.code} - ${row.original.chartOfAccount.name}`
          : "—",
    },
    {
      id: "costCenter",
      header: "Centro de Custo",
      cell: ({ row }) =>
        row.original.costCenter
          ? `${row.original.costCenter.code} - ${row.original.costCenter.name}`
          : "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={STAGING_STATUS_COLORS[row.original.status]}>
          {STAGING_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Acoes",
      cell: ({ row }) => {
        const entry = row.original;
        const canEdit = entry.status === "PENDING" || entry.status === "AUTO_CLASSIFIED";
        return (
          <div className="flex gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(entry);
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
                onClick={() => {
                  startTransition(async () => {
                    await validateEntries([entry.id]);
                    router.refresh();
                  });
                }}
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
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
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
          onClick={() => setCreateOpen(true)}
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
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lancamento Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input name="date" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  name="transactionType"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DEBIT">Debito</option>
                  <option value="CREDIT">Credito</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Descricao *</label>
                <Input name="description" required />
              </div>
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input name="amount" type="number" step="0.01" required />
              </div>
              <div>
                <label className="text-sm font-medium">Contrapartida</label>
                <Input name="counterpartName" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Conta Contabil</label>
                <select
                  name="chartOfAccountId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta Bancaria</label>
                <select
                  name="bankAccountId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Fornecedor</label>
                <select
                  name="supplierId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Observacoes</label>
                <Input name="notes" placeholder="Notas adicionais..." />
              </div>
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lancamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input
                  name="date"
                  type="date"
                  defaultValue={
                    editing
                      ? new Date(editing.date).toISOString().split("T")[0]
                      : ""
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  name="transactionType"
                  defaultValue={editing?.transactionType ?? "DEBIT"}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DEBIT">Debito</option>
                  <option value="CREDIT">Credito</option>
                </select>
              </div>
              <div className="col-span-2">
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
              <div>
                <label className="text-sm font-medium">Contrapartida</label>
                <Input
                  name="counterpartName"
                  defaultValue={editing?.counterpartName ?? ""}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Conta Contabil</label>
                <select
                  name="chartOfAccountId"
                  defaultValue={editing?.chartOfAccountId ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta Bancaria</label>
                <select
                  name="bankAccountId"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Fornecedor</label>
                <select
                  name="supplierId"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {lookups.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Observacoes</label>
                <Input name="notes" placeholder="Notas adicionais..." />
              </div>
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
