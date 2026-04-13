"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MIGRATION_BATCH_STATUS_LABELS,
  MIGRATION_BATCH_STATUS_COLORS,
  MIGRATION_BATCH_TYPE_LABELS,
  MIGRATION_ENTITY_TYPE_LABELS,
  MIGRATION_ITEM_STATUS_LABELS,
  MIGRATION_ITEM_STATUS_COLORS,
  MIGRATION_SEVERITY_LABELS,
  MIGRATION_SEVERITY_COLORS,
} from "@/lib/constants/statuses";
import { formatDateTime, formatCurrency } from "@/lib/utils/format";
import { hasMinRole } from "@/lib/constants/roles";
import {
  validateMigrationBatch,
  approveMigrationBatch,
  processMigrationBatch,
  rollbackMigrationBatch,
  cancelMigrationBatch,
  correctMigrationItem,
  skipMigrationItem,
} from "@/lib/actions/migration";
import type {
  Role,
  MigrationBatchStatus,
  MigrationBatchType,
  MigrationEntityType,
  MigrationItemStatus,
  MigrationSeverity,
} from "@/generated/prisma";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Shield,
  FileText,
  AlertTriangle,
  Info,
  Pencil,
  SkipForward,
  Eye,
} from "lucide-react";

type EntitySummary = {
  entityType: MigrationEntityType;
  totalItems: number;
  validItems: number;
  errorItems: number;
  warningItems: number;
  importedItems: number;
};

type BatchDetail = {
  id: string;
  name: string;
  type: MigrationBatchType;
  status: MigrationBatchStatus;
  description: string | null;
  sourceErpName: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileHash: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  skippedRows: number;
  expectedTotalAmount: number | null;
  actualTotalAmount: number | null;
  confidenceScore: number | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  entitySummaries: EntitySummary[];
  itemCount: number;
  errorCount: number;
};

type ItemError = {
  id: string;
  severity: MigrationSeverity;
  code: string;
  field: string | null;
  message: string;
  suggestion: string | null;
  resolved: boolean;
};

type BatchItem = {
  id: string;
  entityType: MigrationEntityType;
  sheetName: string;
  rowNumber: number;
  status: MigrationItemStatus;
  rawData: Record<string, unknown> | null;
  mappedData: Record<string, unknown> | null;
  correctedData: Record<string, unknown> | null;
  confidenceScore: number | null;
  errors: ItemError[];
};

type BatchError = {
  id: string;
  severity: MigrationSeverity;
  code: string;
  field: string | null;
  message: string;
  suggestion: string | null;
  resolved: boolean;
  rowNumber: number | null;
  entityType: MigrationEntityType | null;
  sheetName: string | null;
};

const SECTION_TABS = [
  { key: "overview", label: "Visao Geral" },
  { key: "items", label: "Itens" },
  { key: "errors", label: "Erros" },
  { key: "actions", label: "Acoes" },
];

interface BatchDetailClientProps {
  batch: BatchDetail;
  items: BatchItem[];
  itemsPagination: { page: number; totalPages: number; total: number };
  errors: BatchError[];
  userRole: Role;
}

export function BatchDetailClient({
  batch,
  items,
  itemsPagination,
  errors,
  userRole,
}: BatchDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState("overview");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Item filters
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  const [itemStatusFilter, setItemStatusFilter] = useState<string>("ALL");

  // Error filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Correct dialog
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctingItem, setCorrectingItem] = useState<BatchItem | null>(null);

  // Data view dialog
  const [viewDataOpen, setViewDataOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<BatchItem | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  const canApprove = hasMinRole(userRole, "CONTROLLER");
  const canAdmin = hasMinRole(userRole, "ADMIN");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (entityFilter !== "ALL" && item.entityType !== entityFilter) return false;
      if (itemStatusFilter !== "ALL" && item.status !== itemStatusFilter) return false;
      return true;
    });
  }, [items, entityFilter, itemStatusFilter]);

  const filteredErrors = useMemo(() => {
    return errors.filter((e) => {
      if (severityFilter !== "ALL" && e.severity !== severityFilter) return false;
      return true;
    });
  }, [errors, severityFilter]);

  // Actions
  async function handleValidate() {
    startTransition(async () => {
      try {
        const result = await validateMigrationBatch(batch.id);
        showFeedback("success", `Validacao concluida! ${result.valid} validos, ${result.errors} erros, ${result.warnings} avisos`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao validar");
      }
    });
  }

  async function handleApprove() {
    startTransition(async () => {
      try {
        await approveMigrationBatch(batch.id);
        showFeedback("success", "Lote aprovado com sucesso!");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao aprovar");
      }
    });
  }

  async function handleProcess() {
    startTransition(async () => {
      try {
        const result = await processMigrationBatch(batch.id);
        showFeedback(
          "success",
          `Importacao concluida! ${result.imported} importados, ${result.failed} falharam.`
        );
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao processar");
      }
    });
  }

  async function handleRollback() {
    if (!confirm("Tem certeza que deseja desfazer toda a importacao deste lote? Esta acao deletara todos os registros criados.")) {
      return;
    }
    startTransition(async () => {
      try {
        await rollbackMigrationBatch(batch.id);
        showFeedback("success", "Rollback concluido com sucesso!");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro no rollback");
      }
    });
  }

  async function handleCancel() {
    if (!confirm("Tem certeza que deseja cancelar este lote?")) return;
    startTransition(async () => {
      try {
        await cancelMigrationBatch(batch.id);
        showFeedback("success", "Lote cancelado");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao cancelar");
      }
    });
  }

  async function handleCorrectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!correctingItem) return;
    const formData = new FormData(e.currentTarget);
    const correctedData: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("field_")) {
        correctedData[key.replace("field_", "")] = value;
      }
    }

    startTransition(async () => {
      try {
        await correctMigrationItem(batch.id, correctingItem.id, correctedData);
        showFeedback("success", "Item corrigido com sucesso!");
        setCorrectOpen(false);
        setCorrectingItem(null);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao corrigir");
      }
    });
  }

  async function handleSkipItem(itemId: string) {
    startTransition(async () => {
      try {
        await skipMigrationItem(batch.id, itemId);
        showFeedback("success", "Item descartado");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao descartar");
      }
    });
  }

  // Get unique entity types from items
  const entityTypes = useMemo(() => {
    const types = new Set(items.map((i) => i.entityType));
    return Array.from(types);
  }, [items]);

  // Determine what actions are available based on status
  const canValidate = ["MAPPED", "UPLOADED"].includes(batch.status);
  const canApproveAction = ["VALIDATED", "REVIEWING"].includes(batch.status) && canApprove;
  const canProcess = batch.status === "APPROVED" && canApprove;
  const canRollbackAction = ["COMPLETED", "COMPLETED_PARTIAL"].includes(batch.status) && canAdmin;
  const canCancelAction = !["COMPLETED", "COMPLETED_PARTIAL", "ROLLED_BACK", "CANCELLED", "PROCESSING"].includes(batch.status);

  return (
    <>
      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-3 font-bold hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* Back + Status Badge */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push("/migration")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-3">
          <Badge className={MIGRATION_BATCH_STATUS_COLORS[batch.status]}>
            {MIGRATION_BATCH_STATUS_LABELS[batch.status]}
          </Badge>
          <Badge variant="outline">
            {MIGRATION_BATCH_TYPE_LABELS[batch.type]}
          </Badge>
          {batch.confidenceScore !== null && (
            <Badge variant="outline" className="tabular-nums">
              Score: {batch.confidenceScore}%
            </Badge>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTION_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeSection === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(tab.key)}
          >
            {tab.label}
            {tab.key === "errors" && batch.errorCount > 0 && (
              <Badge variant="destructive" className="ml-2">{batch.errorCount}</Badge>
            )}
            {tab.key === "items" && (
              <Badge variant="secondary" className="ml-2">{batch.itemCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* OVERVIEW SECTION */}
      {activeSection === "overview" && (
        <>
          {/* Migration progress stepper */}
          <MigrationStepper status={batch.status} />

          {/* Next step action panel — always visible on overview */}
          {(canValidate || canApproveAction || canProcess) && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-0.5">
                      Proximo Passo
                    </p>
                    <p className="text-sm text-foreground">
                      {canValidate &&
                        "Valide o lote para verificar se todos os dados estao corretos antes de aprovar."}
                      {canApproveAction &&
                        "O lote foi validado. Aprove para liberar o processamento da importacao."}
                      {canProcess &&
                        "O lote esta aprovado. Processe a importacao para criar os registros no sistema."}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canValidate && (
                      <Button onClick={handleValidate} disabled={isPending} size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {isPending ? "Validando..." : "Validar Lote"}
                      </Button>
                    )}
                    {canApproveAction && (
                      <Button
                        onClick={handleApprove}
                        disabled={isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {isPending ? "Aprovando..." : "Aprovar Lote"}
                      </Button>
                    )}
                    {canProcess && (
                      <Button
                        onClick={handleProcess}
                        disabled={isPending}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {isPending ? "Processando..." : "Processar Importacao"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed / cancelled / rolled-back status banner */}
          {["COMPLETED", "COMPLETED_PARTIAL"].includes(batch.status) && (
            <Card className="border-2 border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Importacao concluida
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    {batch.processedRows} registros importados com sucesso
                    {batch.errorRows > 0 && `, ${batch.errorRows} com erros`}
                    {batch.skippedRows > 0 && `, ${batch.skippedRows} descartados`}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {batch.status === "CANCELLED" && (
            <Card className="border-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/30">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-6 w-6 text-gray-500 shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Este lote foi cancelado.</p>
              </CardContent>
            </Card>
          )}

          {/* Batch info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{batch.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total de Linhas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-green-600">{batch.processedRows}</p>
                <p className="text-xs text-muted-foreground">Processados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-red-600">{batch.errorRows}</p>
                <p className="text-xs text-muted-foreground">Com Erros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-gray-500">{batch.skippedRows}</p>
                <p className="text-xs text-muted-foreground">Descartados</p>
              </CardContent>
            </Card>
          </div>

          {/* Batch details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes do Lote</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Arquivo</dt>
                  <dd className="font-medium">{batch.fileName ?? "\u2014"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tamanho</dt>
                  <dd className="font-medium">
                    {batch.fileSize ? `${(batch.fileSize / 1024).toFixed(1)} KB` : "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ERP Origem</dt>
                  <dd className="font-medium">{batch.sourceErpName ?? "Manual"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Hash SHA-256</dt>
                  <dd className="font-mono text-xs truncate">{batch.fileHash ?? "\u2014"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Criado por</dt>
                  <dd className="font-medium">{batch.createdBy ?? "\u2014"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data de Criacao</dt>
                  <dd className="font-medium">{formatDateTime(batch.createdAt)}</dd>
                </div>
                {batch.approvedBy && (
                  <div>
                    <dt className="text-muted-foreground">Aprovado por</dt>
                    <dd className="font-medium">{batch.approvedBy}</dd>
                  </div>
                )}
                {batch.completedAt && (
                  <div>
                    <dt className="text-muted-foreground">Concluido em</dt>
                    <dd className="font-medium">{formatDateTime(batch.completedAt)}</dd>
                  </div>
                )}
                {batch.expectedTotalAmount !== null && (
                  <div>
                    <dt className="text-muted-foreground">Valor Esperado</dt>
                    <dd className="font-medium">{formatCurrency(batch.expectedTotalAmount)}</dd>
                  </div>
                )}
                {batch.actualTotalAmount !== null && (
                  <div>
                    <dt className="text-muted-foreground">Valor Real</dt>
                    <dd className="font-medium">{formatCurrency(batch.actualTotalAmount)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Entity summaries */}
          {batch.entitySummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo por Entidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left font-medium">Entidade</th>
                        <th className="p-2 text-right font-medium">Total</th>
                        <th className="p-2 text-right font-medium">Validos</th>
                        <th className="p-2 text-right font-medium">Avisos</th>
                        <th className="p-2 text-right font-medium">Erros</th>
                        <th className="p-2 text-right font-medium">Importados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.entitySummaries.map((s) => (
                        <tr key={s.entityType} className="border-b">
                          <td className="p-2 font-medium">
                            {MIGRATION_ENTITY_TYPE_LABELS[s.entityType]}
                          </td>
                          <td className="p-2 text-right tabular-nums">{s.totalItems}</td>
                          <td className="p-2 text-right tabular-nums text-green-600">{s.validItems}</td>
                          <td className="p-2 text-right tabular-nums text-amber-600">{s.warningItems}</td>
                          <td className="p-2 text-right tabular-nums text-red-600">{s.errorItems}</td>
                          <td className="p-2 text-right tabular-nums text-emerald-600">{s.importedItems}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ITEMS SECTION */}
      {activeSection === "items" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium">Entidade</label>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-44"
              >
                <option value="ALL">Todas</option>
                {entityTypes.map((et) => (
                  <option key={et} value={et}>
                    {MIGRATION_ENTITY_TYPE_LABELS[et]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <Select
                value={itemStatusFilter}
                onChange={(e) => setItemStatusFilter(e.target.value)}
                className="w-36"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="VALID">Valido</option>
                <option value="WARNING">Avisos</option>
                <option value="ERROR">Erros</option>
                <option value="SKIPPED">Descartado</option>
                <option value="IMPORTED">Importado</option>
                <option value="FAILED">Falhou</option>
              </Select>
            </div>
            <Badge variant="secondary">
              {filteredItems.length} de {items.length} itens
            </Badge>
          </div>

          {/* Items table */}
          <Card>
            <CardContent className="pt-4">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum item encontrado com os filtros selecionados.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left font-medium">Linha</th>
                        <th className="p-2 text-left font-medium">Entidade</th>
                        <th className="p-2 text-left font-medium">Aba</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Score</th>
                        <th className="p-2 text-left font-medium">Erros</th>
                        <th className="p-2 text-left font-medium">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 tabular-nums">{item.rowNumber}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {MIGRATION_ENTITY_TYPE_LABELS[item.entityType]}
                            </Badge>
                          </td>
                          <td className="p-2 text-xs">{item.sheetName}</td>
                          <td className="p-2">
                            <Badge className={MIGRATION_ITEM_STATUS_COLORS[item.status]}>
                              {MIGRATION_ITEM_STATUS_LABELS[item.status]}
                            </Badge>
                          </td>
                          <td className="p-2 tabular-nums">
                            {item.confidenceScore !== null ? `${item.confidenceScore}%` : "\u2014"}
                          </td>
                          <td className="p-2">
                            {item.errors.length > 0 ? (
                              <span className="text-red-600 font-medium">{item.errors.length}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver dados"
                                onClick={() => {
                                  setViewingItem(item);
                                  setViewDataOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {["PENDING", "ERROR", "WARNING"].includes(item.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Corrigir"
                                  onClick={() => {
                                    setCorrectingItem(item);
                                    setCorrectOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              {["PENDING", "ERROR", "WARNING"].includes(item.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Descartar"
                                  onClick={() => handleSkipItem(item.id)}
                                  disabled={isPending}
                                >
                                  <SkipForward className="h-4 w-4 text-gray-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {itemsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted-foreground">
                    Pagina {itemsPagination.page} de {itemsPagination.totalPages} ({itemsPagination.total} itens)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ERRORS SECTION */}
      {activeSection === "errors" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium">Severidade</label>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-36"
              >
                <option value="ALL">Todas</option>
                <option value="ERROR">Erros</option>
                <option value="WARNING">Avisos</option>
                <option value="INFO">Informacao</option>
              </Select>
            </div>
            <Badge variant="secondary">
              {filteredErrors.length} de {errors.length} erros
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-4">
              {filteredErrors.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p className="text-muted-foreground">Nenhum erro encontrado!</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left font-medium">Severidade</th>
                        <th className="p-2 text-left font-medium">Codigo</th>
                        <th className="p-2 text-left font-medium">Linha</th>
                        <th className="p-2 text-left font-medium">Entidade</th>
                        <th className="p-2 text-left font-medium">Campo</th>
                        <th className="p-2 text-left font-medium">Mensagem</th>
                        <th className="p-2 text-left font-medium">Resolvido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredErrors.map((err) => (
                        <tr key={err.id} className={`border-b ${err.resolved ? "opacity-50" : ""}`}>
                          <td className="p-2">
                            <Badge className={MIGRATION_SEVERITY_COLORS[err.severity]}>
                              {MIGRATION_SEVERITY_LABELS[err.severity]}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">{err.code}</td>
                          <td className="p-2 tabular-nums">{err.rowNumber ?? "\u2014"}</td>
                          <td className="p-2 text-xs">
                            {err.entityType
                              ? MIGRATION_ENTITY_TYPE_LABELS[err.entityType]
                              : "\u2014"}
                          </td>
                          <td className="p-2 font-mono text-xs">{err.field ?? "\u2014"}</td>
                          <td className="p-2">
                            <div>
                              <p>{err.message}</p>
                              {err.suggestion && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                  Sugestao: {err.suggestion}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            {err.resolved ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ACTIONS SECTION */}
      {activeSection === "actions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acoes do Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-1">Status atual</h4>
                <Badge className={MIGRATION_BATCH_STATUS_COLORS[batch.status]}>
                  {MIGRATION_BATCH_STATUS_LABELS[batch.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canValidate && (
                  <Button
                    onClick={handleValidate}
                    disabled={isPending}
                    className="justify-start"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isPending ? "Validando..." : "Validar Lote"}
                  </Button>
                )}

                {canApproveAction && (
                  <Button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="justify-start bg-green-600 hover:bg-green-700"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {isPending ? "Aprovando..." : "Aprovar Lote"}
                  </Button>
                )}

                {canProcess && (
                  <Button
                    onClick={handleProcess}
                    disabled={isPending}
                    className="justify-start bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isPending ? "Processando..." : "Processar Importacao"}
                  </Button>
                )}

                {canRollbackAction && (
                  <Button
                    variant="destructive"
                    onClick={handleRollback}
                    disabled={isPending}
                    className="justify-start"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {isPending ? "Desfazendo..." : "Desfazer Importacao (Rollback)"}
                  </Button>
                )}

                {canCancelAction && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Lote
                  </Button>
                )}
              </div>

              {!canValidate && !canApproveAction && !canProcess && !canRollbackAction && !canCancelAction && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma acao disponivel para o status atual do lote
                  {!canApprove && " (ou seu nivel de permissao)"}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Data Dialog */}
      <Dialog open={viewDataOpen} onOpenChange={setViewDataOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Dados da Linha {viewingItem?.rowNumber} —{" "}
              {viewingItem?.entityType
                ? MIGRATION_ENTITY_TYPE_LABELS[viewingItem.entityType]
                : ""}
            </DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-4">
              {viewingItem.mappedData && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Dados Mapeados</h4>
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-48">
                    {JSON.stringify(viewingItem.mappedData, null, 2)}
                  </pre>
                </div>
              )}
              {viewingItem.correctedData && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Dados Corrigidos</h4>
                  <pre className="bg-green-50 rounded-md p-3 text-xs overflow-auto max-h-48">
                    {JSON.stringify(viewingItem.correctedData, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-2">Dados Originais</h4>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-48">
                  {JSON.stringify(viewingItem.rawData, null, 2)}
                </pre>
              </div>
              {viewingItem.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Erros ({viewingItem.errors.length})</h4>
                  <div className="space-y-2">
                    {viewingItem.errors.map((err) => (
                      <div
                        key={err.id}
                        className={`rounded-md p-2 text-sm ${
                          err.severity === "ERROR"
                            ? "bg-red-50 text-red-800"
                            : err.severity === "WARNING"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-blue-50 text-blue-800"
                        }`}
                      >
                        <span className="font-mono text-xs">[{err.code}]</span>{" "}
                        {err.field && <span className="font-medium">{err.field}: </span>}
                        {err.message}
                        {err.suggestion && (
                          <span className="block text-xs mt-0.5 opacity-75">
                            Sugestao: {err.suggestion}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDataOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correct Item Dialog */}
      <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Corrigir Linha {correctingItem?.rowNumber}
            </DialogTitle>
          </DialogHeader>
          {correctingItem && (
            <form onSubmit={handleCorrectSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(
                  (correctingItem.correctedData ?? correctingItem.mappedData ?? correctingItem.rawData ?? {}) as Record<string, unknown>
                ).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{key}</label>
                    <Input
                      name={`field_${key}`}
                      defaultValue={value != null ? String(value) : ""}
                    />
                    {correctingItem.errors
                      .filter((e) => e.field === key)
                      .map((e) => (
                        <p key={e.id} className="text-xs text-red-600 mt-0.5">
                          {e.message}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCorrectOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar Correcao"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Migration stepper — visual progress indicator                      */
/* ------------------------------------------------------------------ */
const STEPPER_STEPS = [
  { key: "UPLOADED", label: "Enviado" },
  { key: "VALIDATED", label: "Validado" },
  { key: "APPROVED", label: "Aprovado" },
  { key: "PROCESSING", label: "Processando" },
  { key: "COMPLETED", label: "Concluido" },
] as const;

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  DRAFT: -1,
  UPLOADED: 0,
  MAPPED: 0,
  VALIDATED: 1,
  REVIEWING: 1,
  PENDING_APPROVAL: 1,
  APPROVED: 2,
  PROCESSING: 3,
  COMPLETED: 4,
  COMPLETED_PARTIAL: 4,
  CANCELLED: -2,
  ROLLED_BACK: -2,
  FAILED: -2,
};

function MigrationStepper({ status }: { status: string }) {
  const currentIdx = STATUS_TO_STEP_INDEX[status] ?? -1;

  if (currentIdx === -2) return null; // cancelled / rolled-back

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {STEPPER_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-all",
                  isCompleted && "bg-green-600 border-green-600 text-white",
                  isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  isCompleted && "text-green-600",
                  isCurrent && "text-primary font-bold",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPPER_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1.5 rounded-full min-w-[20px]",
                  idx < currentIdx ? "bg-green-500" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
