"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  applyProductTemplate,
} from "@/lib/actions/master-data";
import { formatCurrency } from "@/lib/utils/format";
import {
  Plus,
  Pencil,
  Trash2,
  FileDown,
  LayoutTemplate,
  UtensilsCrossed,
  Briefcase,
  ShoppingCart,
  Package,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
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

type TemplateInfo = {
  id: string;
  name: string;
  description: string;
  productCount: number;
};

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  geral: LayoutTemplate,
  alimentos_bebidas: UtensilsCrossed,
  servicos: Briefcase,
  comercio: ShoppingCart,
};

const TEMPLATE_COLORS: Record<string, string> = {
  geral: "border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5",
  alimentos_bebidas: "border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5",
  servicos: "border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/5",
  comercio: "border-green-500/30 hover:border-green-500 hover:bg-green-500/5",
};

const TEMPLATE_ICON_COLORS: Record<string, string> = {
  geral: "text-blue-500",
  alimentos_bebidas: "text-orange-500",
  servicos: "text-purple-500",
  comercio: "text-green-500",
};

export function ProductsClient({
  data,
  templates,
}: {
  data: Product[];
  templates: TemplateInfo[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [clearExisting, setClearExisting] = useState(true);
  const [templateResult, setTemplateResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const hasProducts = data.length > 0;
  const showTemplateSelector = !hasProducts;

  const columns: ColumnDef<Product>[] = [
    { accessorKey: "code", header: "Codigo" },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "unit", header: "Unidade" },
    {
      accessorKey: "costPrice",
      header: "Preco de Custo",
      cell: ({ row }) => formatCurrency(row.original.costPrice),
    },
    {
      accessorKey: "salePrice",
      header: "Preco de Venda",
      cell: ({ row }) => formatCurrency(row.original.salePrice),
    },
    {
      accessorKey: "minStock",
      header: "Estoque Min.",
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

  function handleApplyTemplate() {
    if (!selectedTemplate) return;
    startTransition(async () => {
      try {
        const result = await applyProductTemplate(selectedTemplate, {
          clearExisting,
        });
        setTemplateResult({
          type: "success",
          message: `Template "${result.templateName}" aplicado! ${result.created} produtos criados.`,
        });
        setTemplateDialogOpen(false);
        setSelectedTemplate(null);
        router.refresh();
      } catch (err: unknown) {
        setTemplateResult({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Erro ao aplicar template",
        });
      }
    });
  }

  return (
    <>
      {/* Feedback banner */}
      {templateResult && (
        <div
          className={`rounded-lg border p-3 flex items-center gap-2 ${
            templateResult.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
          }`}
        >
          {templateResult.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm">{templateResult.message}</span>
          <button
            className="ml-auto text-xs underline"
            onClick={() => setTemplateResult(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Template selector — shown when no products exist */}
      {showTemplateSelector && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos Pre-definidos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione um modelo com produtos e servicos pre-configurados para
              seu tipo de negocio. Voce pode personalizar depois.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => {
                const Icon = TEMPLATE_ICONS[t.id] ?? LayoutTemplate;
                const colorClass = TEMPLATE_COLORS[t.id] ?? "";
                const iconColor =
                  TEMPLATE_ICON_COLORS[t.id] ?? "text-muted-foreground";
                return (
                  <button
                    key={t.id}
                    disabled={isPending}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setClearExisting(true);
                      setTemplateDialogOpen(true);
                    }}
                    className={`group relative rounded-lg border-2 p-4 text-left transition-all ${colorClass} disabled:opacity-50`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-8 w-8 shrink-0 ${iconColor}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.productCount} produtos
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap gap-2 justify-end">
        {hasProducts && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTemplate(null);
              setClearExisting(false);
              setTemplateDialogOpen(true);
            }}
          >
            <FileDown className="mr-2 h-4 w-4" /> Aplicar Modelo
          </Button>
        )}
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Data table */}
      {hasProducts && (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Buscar produto..."
        />
      )}

      {/* Template confirmation dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aplicar Modelo de Produtos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template selector when opened from "Aplicar Modelo" button */}
            {!selectedTemplate && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Escolha o modelo:
                </p>
                <div className="grid gap-2">
                  {templates.map((t) => {
                    const Icon = TEMPLATE_ICONS[t.id] ?? LayoutTemplate;
                    const iconColor =
                      TEMPLATE_ICON_COLORS[t.id] ?? "text-muted-foreground";
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.productCount} produtos
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirmation when template is selected */}
            {selectedTemplate && (
              <>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">
                    Modelo selecionado:{" "}
                    {templates.find((t) => t.id === selectedTemplate)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {
                      templates.find((t) => t.id === selectedTemplate)
                        ?.description
                    }
                  </p>
                </div>

                {hasProducts && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                          Atencao
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                          Voce ja tem {data.length} produtos cadastrados.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clearExisting}
                        onChange={(e) => setClearExisting(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm">
                        Substituir produtos atuais (apaga todos os existentes)
                      </span>
                    </label>
                    {!clearExisting && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Produtos com codigo duplicado serao ignorados.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTemplateDialogOpen(false);
                setSelectedTemplate(null);
              }}
            >
              Cancelar
            </Button>
            {selectedTemplate && (
              <Button onClick={handleApplyTemplate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Aplicar Modelo
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New/Edit product dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Codigo *</label>
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
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Descricao</label>
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
                  placeholder="UN, KG, L, CX, HR..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preco de Custo</label>
                <Input
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.costPrice ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preco de Venda</label>
                <Input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.salePrice ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estoque Minimo</label>
                <Input
                  name="minStock"
                  type="number"
                  min="0"
                  defaultValue={editing?.minStock ?? 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Ponto de Reposicao
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
