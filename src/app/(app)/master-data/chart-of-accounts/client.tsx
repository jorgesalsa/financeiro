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
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
} from "@/lib/actions/master-data";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AccountType } from "@/generated/prisma";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  REVENUE: "Receita",
  DEDUCTION: "Dedução",
  COST: "Custo",
  EXPENSE: "Despesa",
  INVESTMENT: "Investimento",
};

const ACCOUNT_TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  REVENUE: "default",
  DEDUCTION: "secondary",
  COST: "outline",
  EXPENSE: "destructive",
  INVESTMENT: "secondary",
};

type ChartOfAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  level: number;
  parentId: string | null;
  parent?: { code: string; name: string } | null;
  isAnalytic: boolean;
  active: boolean;
};

export function ChartOfAccountsClient({
  data,
}: {
  data: ChartOfAccount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const hasAccounts = data.length > 0;

  const columns: ColumnDef<ChartOfAccount>[] = [
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => (
        <span
          style={{ paddingLeft: `${(row.original.level - 1) * 16}px` }}
          className={row.original.isAnalytic ? "" : "font-semibold"}
        >
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <span className={row.original.isAnalytic ? "" : "font-semibold"}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant={ACCOUNT_TYPE_VARIANTS[row.original.type] ?? "outline"}>
          {ACCOUNT_TYPE_LABELS[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    { accessorKey: "level", header: "Nível" },
    {
      accessorKey: "isAnalytic",
      header: "Analítica",
      cell: ({ row }) => (
        <Badge variant={row.original.isAnalytic ? "default" : "secondary"}>
          {row.original.isAnalytic ? "Sim" : "Não"}
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
              if (confirm("Deseja desativar esta conta?")) {
                await deleteChartOfAccount(row.original.id);
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

  const syntheticAccounts = data.filter((a) => !a.isAnalytic);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const values = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: formData.get("type") as AccountType,
      parentId: (formData.get("parentId") as string) || null,
      isAnalytic: formData.get("isAnalytic") === "on",
      active: true,
    };

    try {
      if (editing) {
        await updateChartOfAccount(editing.id, values);
      } else {
        await createChartOfAccount(values);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar conta";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Conta
        </Button>
      </div>

      {/* Data table */}
      {hasAccounts && (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Buscar conta..."
        />
      )}

      {/* New/Edit account dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Conta" : "Nova Conta"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Código *</label>
                <Input
                  name="code"
                  defaultValue={editing?.code ?? ""}
                  required
                />
              </div>
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
                  <option value="REVENUE">Receita</option>
                  <option value="DEDUCTION">Dedução</option>
                  <option value="COST">Custo</option>
                  <option value="EXPENSE">Despesa</option>
                  <option value="INVESTMENT">Investimento</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta Pai</label>
                <select
                  name="parentId"
                  defaultValue={editing?.parentId ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Nenhuma (raiz)</option>
                  {syntheticAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isAnalytic"
                  id="isAnalytic"
                  defaultChecked={editing?.isAnalytic ?? true}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="isAnalytic" className="text-sm font-medium">
                  Conta Analítica (permite lançamentos)
                </label>
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
