"use client";

import { useState } from "react";
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
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/lib/actions/master-data";
import { formatCurrency } from "@/lib/utils/format";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BankAccountType } from "@/generated/prisma";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
};

type BankAccount = {
  id: string;
  bankName: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
  active: boolean;
};

export function BankAccountsClient({ data }: { data: BankAccount[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: ColumnDef<BankAccount>[] = [
    { accessorKey: "bankName", header: "Banco" },
    { accessorKey: "bankCode", header: "Código" },
    { accessorKey: "agency", header: "Agência" },
    { accessorKey: "accountNumber", header: "Conta" },
    {
      accessorKey: "accountType",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="outline">
          {ACCOUNT_TYPE_LABELS[row.original.accountType] ??
            row.original.accountType}
        </Badge>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Saldo Atual",
      cell: ({ row }) => formatCurrency(row.original.currentBalance),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (confirm("Deseja desativar esta conta bancária?")) {
                await deleteBankAccount(row.original.id);
                router.refresh();
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const values = {
      bankName: formData.get("bankName") as string,
      bankCode: formData.get("bankCode") as string,
      agency: formData.get("agency") as string,
      accountNumber: formData.get("accountNumber") as string,
      accountType: formData.get("accountType") as BankAccountType,
      initialBalance: parseFloat(
        (formData.get("initialBalance") as string) || "0"
      ),
      active: true,
    };

    try {
      if (editing) {
        await updateBankAccount(editing.id, values);
      } else {
        await createBankAccount(values);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar conta bancária";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Conta Bancária
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="bankName"
        searchPlaceholder="Buscar conta bancária..."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Conta Bancária" : "Nova Conta Bancária"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Nome do Banco *</label>
                <Input
                  name="bankName"
                  defaultValue={editing?.bankName ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Código do Banco *</label>
                <Input
                  name="bankCode"
                  defaultValue={editing?.bankCode ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Agência *</label>
                <Input
                  name="agency"
                  defaultValue={editing?.agency ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Número da Conta *
                </label>
                <Input
                  name="accountNumber"
                  defaultValue={editing?.accountNumber ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Conta *</label>
                <select
                  name="accountType"
                  defaultValue={editing?.accountType ?? ""}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Selecione...</option>
                  <option value="CHECKING">Corrente</option>
                  <option value="SAVINGS">Poupança</option>
                  <option value="INVESTMENT">Investimento</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Saldo Inicial</label>
                <Input
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  defaultValue={editing ? editing.currentBalance : 0}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
