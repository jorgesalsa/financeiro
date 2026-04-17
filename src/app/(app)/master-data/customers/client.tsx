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
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/master-data";
import { formatCnpjCpf } from "@/lib/utils/cnpj-cpf";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  tradeName: string | null;
  cnpjCpf: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
};

export function CustomersClient({ data }: { data: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "tradeName", header: "Nome Fantasia" },
    {
      accessorKey: "cnpjCpf",
      header: "CNPJ/CPF",
      cell: ({ row }) => formatCnpjCpf(row.original.cnpjCpf),
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Telefone" },
    {
      accessorKey: "city",
      header: "Cidade/UF",
      cell: ({ row }) => {
        const { city, state } = row.original;
        if (city && state) return `${city}/${state}`;
        return city || state || "-";
      },
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
              if (confirm("Deseja desativar este cliente?")) {
                await deleteCustomer(row.original.id);
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
      tradeName: (formData.get("tradeName") as string) || null,
      cnpjCpf: formData.get("cnpjCpf") as string,
      stateRegistration: (formData.get("stateRegistration") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zipCode: (formData.get("zipCode") as string) || null,
      notes: (formData.get("notes") as string) || null,
      active: true,
    };

    try {
      if (editing) {
        await updateCustomer(editing.id, values);
      } else {
        await createCustomer(values);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar cliente";
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
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Buscar cliente..."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome Fantasia</label>
                <Input
                  name="tradeName"
                  defaultValue={editing?.tradeName ?? ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium">CNPJ/CPF *</label>
                <Input
                  name="cnpjCpf"
                  defaultValue={editing?.cnpjCpf ?? ""}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Inscrição Estadual
                </label>
                <Input name="stateRegistration" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editing?.email ?? ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input name="phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Endereço</label>
                <Input name="address" />
              </div>
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input name="city" defaultValue={editing?.city ?? ""} />
              </div>
              <div>
                <label className="text-sm font-medium">UF</label>
                <Input
                  name="state"
                  defaultValue={editing?.state ?? ""}
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">CEP</label>
                <Input name="zipCode" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <textarea
                name="notes"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
              />
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
