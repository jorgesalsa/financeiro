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
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/actions/master-data";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PaymentMethodType } from "@/generated/prisma";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  BANK_TRANSFER: "Transferência",
  PIX: "PIX",
  CREDIT_CARD: "Cartão Crédito",
  DEBIT_CARD: "Cartão Débito",
  BOLETO: "Boleto",
  CHECK: "Cheque",
  OTHER: "Outro",
};

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  daysToSettle: number;
  feePercentage: number;
  active: boolean;
};

export function PaymentMethodsClient({ data }: { data: PaymentMethod[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: ColumnDef<PaymentMethod>[] = [
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="outline">
          {PAYMENT_TYPE_LABELS[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "daysToSettle",
      header: "Dias p/ Liquidação",
      cell: ({ row }) =>
        row.original.daysToSettle === 0
          ? "Imediato"
          : `${row.original.daysToSettle} dias`,
    },
    {
      accessorKey: "feePercentage",
      header: "Taxa (%)",
      cell: ({ row }) => `${row.original.feePercentage.toFixed(2)}%`,
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
              if (confirm("Deseja desativar esta forma de pagamento?")) {
                await deletePaymentMethod(row.original.id);
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
      name: formData.get("name") as string,
      type: formData.get("type") as PaymentMethodType,
      daysToSettle: parseInt(
        (formData.get("daysToSettle") as string) || "0",
        10
      ),
      feePercentage: parseFloat(
        (formData.get("feePercentage") as string) || "0"
      ),
      active: true,
    };

    try {
      if (editing) {
        await updatePaymentMethod(editing.id, values);
      } else {
        await createPaymentMethod(values);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao salvar forma de pagamento";
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
          <Plus className="mr-2 h-4 w-4" /> Nova Forma de Pagamento
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Buscar forma de pagamento..."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar Forma de Pagamento"
                : "Nova Forma de Pagamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  name="type"
                  defaultValue={editing?.type ?? ""}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Selecione...</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="BANK_TRANSFER">Transferência</option>
                  <option value="PIX">PIX</option>
                  <option value="CREDIT_CARD">Cartão Crédito</option>
                  <option value="DEBIT_CARD">Cartão Débito</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CHECK">Cheque</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Dias para Liquidação
                </label>
                <Input
                  name="daysToSettle"
                  type="number"
                  min="0"
                  defaultValue={editing?.daysToSettle ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Taxa (%)</label>
                <Input
                  name="feePercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.feePercentage ?? 0}
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
