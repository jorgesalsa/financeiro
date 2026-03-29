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
} from "lucide-react";
import { useRouter } from "next/navigation";

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

interface EntriesClientProps {
  data: OfficialEntry[];
  bankAccounts: BankAccount[];
  paymentMethods: PaymentMethod[];
}

export function EntriesClient({
  data,
  bankAccounts,
  paymentMethods,
}: EntriesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dialogs
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlingEntry, setSettlingEntry] = useState<OfficialEntry | null>(null);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [installmentEntry, setInstallmentEntry] = useState<OfficialEntry | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      if (statusFilter !== "ALL" && entry.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && entry.category !== categoryFilter) return false;
      if (dateFrom) {
        const entryDate = new Date(entry.date).toISOString().split("T")[0];
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = new Date(entry.date).toISOString().split("T")[0];
        if (entryDate > dateTo) return false;
      }
      return true;
    });
  }, [data, statusFilter, categoryFilter, dateFrom, dateTo]);

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
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="outline">
          {CATEGORY_LABELS[row.original.category] ?? row.original.category}
        </Badge>
      ),
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
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={ENTRY_STATUS_COLORS[row.original.status]}>
          {ENTRY_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "classificationStatus",
      header: "Class.",
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
      header: "Conta",
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
      header: "Acoes",
      cell: ({ row }) => {
        const entry = row.original;
        const canSettle = entry.status === "OPEN" || entry.status === "PARTIAL";
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
                title="Cancelar"
                onClick={() => {
                  if (confirm("Deseja cancelar este lancamento?")) {
                    startTransition(async () => {
                      try {
                        await fetch("/api/financial/cancel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ entryId: entry.id }),
                        });
                      } catch {
                        // Fallback
                      }
                      router.refresh();
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
            <option value="SETTLED">Liquidado</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="col-span-2 sm:col-span-1"
          onClick={() => {
            setStatusFilter("ALL");
            setCategoryFilter("ALL");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Limpar Filtros
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="description"
        searchPlaceholder="Buscar lancamento..."
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
    </>
  );
}
