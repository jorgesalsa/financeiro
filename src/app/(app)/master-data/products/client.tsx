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
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/actions/master-data";
import { formatCurrency } from "@/lib/utils/format";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  reorderPoint: number;
  active: boolean;
};

export function ProductsClient({ data }: { data: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: ColumnDef<Product>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "unit", header: "Unidade" },
    {
      accessorKey: "costPrice",
      header: "Preço de Custo",
      cell: ({ row }) => formatCurrency(row.original.costPrice),
    },
    {
      accessorKey: "salePrice",
      header: "Preço de Venda",
      cell: ({ row }) => formatCurrency(row.original.salePrice),
    },
    {
      accessorKey: "minStock",
      header: "Estoque Mín.",
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
              if (confirm("Deseja desativar este produto?")) {
                await deleteProduct(row.original.id);
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
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      unit: formData.get("unit") as string,
      costPrice: parseFloat((formData.get("costPrice") as string) || "0"),
      salePrice: parseFloat((formData.get("salePrice") as string) || "0"),
      minStock: parseInt((formData.get("minStock") as string) || "0", 10),
      reorderPoint: parseInt(
        (formData.get("reorderPoint") as string) || "0",
        10
      ),
      active: true,
    };

    try {
      if (editing) {
        await updateProduct(editing.id, values);
      } else {
        await createProduct(values);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar produto";
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
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Buscar produto..."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unidade *</label>
                <Input
                  name="unit"
                  defaultValue={editing?.unit ?? ""}
                  placeholder="UN, KG, L, CX..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preço de Custo</label>
                <Input
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.costPrice ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preço de Venda</label>
                <Input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.salePrice ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estoque Mínimo</label>
                <Input
                  name="minStock"
                  type="number"
                  min="0"
                  defaultValue={editing?.minStock ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Ponto de Reposição
                </label>
                <Input
                  name="reorderPoint"
                  type="number"
                  min="0"
                  defaultValue={editing?.reorderPoint ?? 0}
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
