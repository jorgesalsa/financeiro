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
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  applyChartTemplate,
} from "@/lib/actions/master-data";
import {
  Plus,
  Pencil,
  Trash2,
  FileDown,
  UtensilsCrossed,
  Briefcase,
  ShoppingCart,
  BookOpen,
  LayoutTemplate,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AccountType } from "@/generated/prisma";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Ativo",
  LIABILITY: "Passivo",
  EQUITY: "Patrimônio Líquido",
  REVENUE: "Receita",
  EXPENSE: "Despesa",
};

const ACCOUNT_TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ASSET: "default",
  LIABILITY: "secondary",
  EQUITY: "outline",
  REVENUE: "default",
  EXPENSE: "destructive",
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

type TemplateInfo = {
  id: string;
  name: string;
  description: string;
  accountCount: number;
};

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  financeiro_geral: LayoutTemplate,
  alimentos_bebidas: UtensilsCrossed,
  servicos: Briefcase,
  comercio: ShoppingCart,
  contabil: BookOpen,
};

const TEMPLATE_COLORS: Record<string, string> = {
  financeiro_geral: "border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5",
  alimentos_bebidas: "border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5",
  servicos: "border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/5",
  comercio: "border-green-500/30 hover:border-green-500 hover:bg-green-500/5",
  contabil: "border-gray-500/30 hover:border-gray-500 hover:bg-gray-500/5",
};

const TEMPLATE_ICON_COLORS: Record<string, string> = {
  financeiro_geral: "text-blue-500",
  alimentos_bebidas: "text-orange-500",
  servicos: "text-purple-500",
  comercio: "text-green-500",
  contabil: "text-gray-500",
};

export function ChartOfAccountsClient({
  data,
  templates,
}: {
  data: ChartOfAccount[];
  templates: TemplateInfo[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAccount | null>(null);
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

  const hasAccounts = data.length > 0;
  const showTemplateSelector = !hasAccounts;

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

  function handleApplyTemplate() {
    if (!selectedTemplate) return;
    startTransition(async () => {
      try {
        const result = await applyChartTemplate(selectedTemplate, {
          clearExisting,
        });
        setTemplateResult({
          type: "success",
          message: `Template "${result.templateName}" aplicado com sucesso! ${result.created} contas criadas.`,
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
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
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

      {/* Template selector — shown when no accounts exist OR via button */}
      {showTemplateSelector && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Escolha um Modelo de Plano de Contas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione um modelo pré-definido para começar. Você pode
              personalizar depois.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => {
                const Icon = TEMPLATE_ICONS[t.id] ?? LayoutTemplate;
                const colorClass = TEMPLATE_COLORS[t.id] ?? "";
                const iconColor = TEMPLATE_ICON_COLORS[t.id] ?? "text-muted-foreground";
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
                          {t.accountCount} contas
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
        {hasAccounts && (
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

      {/* Template confirmation dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aplicar Modelo de Plano de Contas</DialogTitle>
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
                    const iconColor = TEMPLATE_ICON_COLORS[t.id] ?? "text-muted-foreground";
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
                            {t.accountCount} contas
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

                {hasAccounts && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Atenção
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Você já tem {data.length} contas cadastradas.
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
                        Substituir plano atual (apaga todas as contas existentes)
                      </span>
                    </label>
                    {!clearExisting && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Contas com código duplicado serão ignoradas.
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
                  <option value="ASSET">Ativo</option>
                  <option value="LIABILITY">Passivo</option>
                  <option value="EQUITY">Patrimônio Líquido</option>
                  <option value="REVENUE">Receita</option>
                  <option value="EXPENSE">Despesa</option>
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
