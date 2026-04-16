"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
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
import { getErrorImpact, type ErrorImpactInfo } from "@/lib/constants/migration-errors";
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
  bulkDismissFieldErrors,
  bulkFillField,
  bulkSkipErrorItems,
  bulkSkipGroupItems,
  bulkResolveNonBlocking,
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
  AlertTriangle,
  Pencil,
  SkipForward,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  ListChecks,
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
  itemStatus: MigrationItemStatus | null;
};

/** Grouped error representation */
type ErrorGroup = {
  key: string;
  code: string;
  field: string | null;
  entityType: MigrationEntityType | null;
  severity: MigrationSeverity;
  count: number;
  unresolvedCount: number;
  impact: ErrorImpactInfo | null;
  errors: BatchError[];
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

  // Correct dialog
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctingItem, setCorrectingItem] = useState<BatchItem | null>(null);

  // Data view dialog
  const [viewDataOpen, setViewDataOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<BatchItem | null>(null);

  // Bulk action dialogs
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [activeErrorGroup, setActiveErrorGroup] = useState<ErrorGroup | null>(null);
  const [fillValue, setFillValue] = useState("");

  // Errors detail toggle
  const [showDetailErrors, setShowDetailErrors] = useState(false);
  const [errorsPage, setErrorsPage] = useState(1);
  const ERRORS_PER_PAGE = 50;

  // Error filter
  const [errorTypeFilter, setErrorTypeFilter] = useState<"ALL" | "BLOCKING" | "NON_BLOCKING">("ALL");

  // Approve dialog info
  const [approveNonBlockingCount, setApproveNonBlockingCount] = useState(0);
  const [approveBlockingDetails, setApproveBlockingDetails] = useState<{ field: string; count: number }[]>([]);

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

  // Group errors by (code, entityType, field)
  const errorGroups = useMemo(() => {
    const groups = new Map<string, ErrorGroup>();
    for (const err of errors) {
      const key = `${err.code}:${err.entityType ?? ""}:${err.field ?? ""}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          code: err.code,
          field: err.field,
          entityType: err.entityType,
          severity: err.severity,
          count: 0,
          unresolvedCount: 0,
          impact: getErrorImpact(err.code, err.entityType, err.field),
          errors: [],
        });
      }
      const group = groups.get(key)!;
      group.count++;
      if (!err.resolved) group.unresolvedCount++;
      group.errors.push(err);
    }
    // Sort: unresolved first, then blocking first, then by count desc
    return Array.from(groups.values()).sort((a, b) => {
      if (a.unresolvedCount > 0 && b.unresolvedCount === 0) return -1;
      if (a.unresolvedCount === 0 && b.unresolvedCount > 0) return 1;
      const aBlocking = a.impact?.level === "BLOCKING" ? 1 : 0;
      const bBlocking = b.impact?.level === "BLOCKING" ? 1 : 0;
      if (aBlocking !== bBlocking) return bBlocking - aBlocking;
      return b.unresolvedCount - a.unresolvedCount;
    });
  }, [errors]);

  const totalUnresolved = useMemo(() => errors.filter((e) => !e.resolved).length, [errors]);
  const blockingUnresolved = useMemo(() => {
    return errorGroups
      .filter((g) => g.impact?.level === "BLOCKING" && g.unresolvedCount > 0)
      .reduce((sum, g) => sum + g.unresolvedCount, 0);
  }, [errorGroups]);
  const nonBlockingUnresolved = useMemo(() => totalUnresolved - blockingUnresolved, [totalUnresolved, blockingUnresolved]);

  // Filtered error groups based on errorTypeFilter
  const filteredErrorGroups = useMemo(() => {
    if (errorTypeFilter === "ALL") return errorGroups;
    return errorGroups.filter((g) => {
      const isBlocking = g.impact?.level === "BLOCKING" || !g.impact;
      if (errorTypeFilter === "BLOCKING") return isBlocking;
      return !isBlocking;
    });
  }, [errorGroups, errorTypeFilter]);

  // Split into sections for visual separation
  const blockingGroups = useMemo(() => filteredErrorGroups.filter((g) => {
    const isBlocking = g.impact?.level === "BLOCKING" || !g.impact;
    return isBlocking && g.unresolvedCount > 0;
  }), [filteredErrorGroups]);
  const nonBlockingGroups = useMemo(() => filteredErrorGroups.filter((g) => {
    const isBlocking = g.impact?.level === "BLOCKING" || !g.impact;
    return !isBlocking && g.unresolvedCount > 0;
  }), [filteredErrorGroups]);
  const resolvedGroups = useMemo(() => filteredErrorGroups.filter((g) => g.unresolvedCount === 0), [filteredErrorGroups]);

  // Paginated detail errors
  const allUnresolvedErrors = useMemo(() => errors.filter((e) => !e.resolved), [errors]);
  const errorsTotalPages = Math.max(1, Math.ceil(allUnresolvedErrors.length / ERRORS_PER_PAGE));
  const safeErrorsPage = Math.min(errorsPage, errorsTotalPages);
  const paginatedDetailErrors = allUnresolvedErrors.slice(
    (safeErrorsPage - 1) * ERRORS_PER_PAGE,
    safeErrorsPage * ERRORS_PER_PAGE
  );

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
        const result = await approveMigrationBatch(batch.id);
        if (result.needsConfirmation) {
          setApproveNonBlockingCount(result.nonBlockingCount ?? 0);
          setApproveDialogOpen(true);
          return;
        }
        if (!result.success) {
          // If blocking errors exist, navigate to errors tab and show detail
          if (result.blockingCount && result.blockingCount > 0) {
            // Build details of what's blocking
            const details = blockingGroups.map((g) => ({
              field: g.impact?.title ?? g.field ?? "Desconhecido",
              count: g.unresolvedCount,
            }));
            setApproveBlockingDetails(details);
            setActiveSection("errors");
            setErrorTypeFilter("BLOCKING");
            showFeedback("error", `${result.blockingCount} erros bloqueantes impedem a aprovacao. Resolva-os abaixo.`);
          } else {
            showFeedback("error", result.error || "Erro ao aprovar");
          }
          return;
        }
        showFeedback("success", "Lote aprovado com sucesso!");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao aprovar");
      }
    });
  }

  async function handleForceApprove() {
    setApproveDialogOpen(false);
    startTransition(async () => {
      try {
        const result = await approveMigrationBatch(batch.id, true);
        if (!result.success) {
          showFeedback("error", result.error || "Erro ao aprovar");
          return;
        }
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
        if (!result.success) {
          showFeedback("error", result.error || "Erro ao processar importacao");
          return;
        }
        showFeedback(
          result.failed && result.failed > 0 ? "error" : "success",
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

  // Bulk handlers
  const handleBulkDismiss = useCallback(async () => {
    if (!activeErrorGroup) return;
    setDismissDialogOpen(false);
    startTransition(async () => {
      try {
        const result = await bulkDismissFieldErrors(
          batch.id,
          activeErrorGroup.entityType ?? "",
          activeErrorGroup.field ?? "",
          activeErrorGroup.code
        );
        showFeedback("success", `${result.resolvedCount} erros resolvidos (campo ignorado)`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao ignorar campo");
      }
    });
  }, [activeErrorGroup, batch.id, router]);

  const handleBulkFill = useCallback(async () => {
    if (!activeErrorGroup || !fillValue) return;
    setFillDialogOpen(false);
    startTransition(async () => {
      try {
        const result = await bulkFillField(
          batch.id,
          activeErrorGroup.entityType ?? "",
          activeErrorGroup.field ?? "",
          fillValue,
          activeErrorGroup.code
        );
        showFeedback("success", `${result.updatedCount} itens atualizados, ${result.resolvedCount} erros resolvidos`);
        setFillValue("");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao preencher em lote");
      }
    });
  }, [activeErrorGroup, fillValue, batch.id, router]);

  const handleBulkSkip = useCallback(async () => {
    setSkipDialogOpen(false);
    startTransition(async () => {
      try {
        const result = await bulkSkipErrorItems(batch.id);
        showFeedback("success", `${result.skippedCount} itens descartados`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao descartar itens");
      }
    });
  }, [batch.id, router]);

  const handleBulkSkipGroup = useCallback(async () => {
    if (!activeErrorGroup) return;
    setDismissDialogOpen(false);
    startTransition(async () => {
      try {
        const result = await bulkSkipGroupItems(
          batch.id,
          activeErrorGroup.entityType ?? "",
          activeErrorGroup.field ?? "",
          activeErrorGroup.code
        );
        showFeedback("success", `${result.skippedCount} itens descartados`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao descartar itens do grupo");
      }
    });
  }, [activeErrorGroup, batch.id, router]);

  function handleBulkSkipGroupWithConfirm(group: ErrorGroup) {
    if (!confirm(`Descartar ${group.unresolvedCount} itens com erro em "${group.impact?.title ?? group.field}"? Esses itens nao serao importados.`)) {
      return;
    }
    setActiveErrorGroup(group);
    startTransition(async () => {
      try {
        const result = await bulkSkipGroupItems(
          batch.id,
          group.entityType ?? "",
          group.field ?? "",
          group.code
        );
        showFeedback("success", `${result.skippedCount} itens descartados`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao descartar itens do grupo");
      }
    });
  }

  const handleResolveAllNonBlocking = useCallback(async () => {
    startTransition(async () => {
      try {
        const result = await bulkResolveNonBlocking(batch.id);
        showFeedback("success", `${result.resolvedCount} avisos nao-bloqueantes resolvidos`);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao resolver avisos");
      }
    });
  }, [batch.id, router]);

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

  const hasUnresolvedErrors = totalUnresolved > 0;
  const showErrorBanner = hasUnresolvedErrors && ["VALIDATED", "REVIEWING", "PENDING_APPROVAL"].includes(batch.status);

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
            x
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
            {tab.key === "errors" && totalUnresolved > 0 && (
              <Badge variant="destructive" className="ml-2">{totalUnresolved}</Badge>
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

          {/* Error banner */}
          {showErrorBanner && (
            <Card className="border-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {totalUnresolved} {totalUnresolved === 1 ? "erro precisa" : "erros precisam"} de atencao
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {blockingUnresolved > 0 && `${blockingUnresolved} bloqueante${blockingUnresolved > 1 ? "s" : ""}`}
                      {blockingUnresolved > 0 && nonBlockingUnresolved > 0 && " | "}
                      {nonBlockingUnresolved > 0 && `${nonBlockingUnresolved} nao-bloqueante${nonBlockingUnresolved > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                  onClick={() => setActiveSection("errors")}
                >
                  Ver Erros
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Next step action panel */}
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

          {/* Completed / cancelled */}
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
                                onClick={() => { setViewingItem(item); setViewDataOpen(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {["PENDING", "ERROR", "WARNING"].includes(item.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Corrigir"
                                  onClick={() => { setCorrectingItem(item); setCorrectOpen(true); }}
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

      {/* ERRORS SECTION — Redesigned with grouped cards + filter + sections */}
      {activeSection === "errors" && (
        <>
          {/* Summary bar + filter */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {blockingUnresolved > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {blockingUnresolved} bloqueante{blockingUnresolved > 1 ? "s" : ""}
                </Badge>
              )}
              {nonBlockingUnresolved > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  {nonBlockingUnresolved} nao-bloqueante{nonBlockingUnresolved > 1 ? "s" : ""}
                </Badge>
              )}
              {totalUnresolved === 0 && errors.length > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                  Todos resolvidos
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {errors.length} erros total ({errors.filter((e) => e.resolved).length} resolvidos)
              </span>
            </div>

            {/* Filter + bulk actions bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-input bg-background overflow-hidden">
                {([
                  { key: "ALL" as const, label: "Todos" },
                  { key: "BLOCKING" as const, label: `Bloqueantes (${blockingGroups.length})` },
                  { key: "NON_BLOCKING" as const, label: `Nao-bloq. (${nonBlockingGroups.length})` },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      errorTypeFilter === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                    onClick={() => setErrorTypeFilter(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {nonBlockingUnresolved > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-300 hover:bg-green-50"
                  onClick={handleResolveAllNonBlocking}
                  disabled={isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isPending ? "Resolvendo..." : "Resolver Nao-bloqueantes"}
                </Button>
              )}
              {batch.errorRows > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setSkipDialogOpen(true)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Descartar Todos com Erro
                </Button>
              )}
            </div>
          </div>

          {/* All groups resolved */}
          {filteredErrorGroups.length === 0 && errorGroups.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p className="text-muted-foreground">Nenhum erro encontrado!</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredErrorGroups.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center">
                  <p className="text-muted-foreground">
                    Nenhum erro com o filtro selecionado.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setErrorTypeFilter("ALL")}
                    className="mt-2"
                  >
                    Ver todos os erros
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Blocking errors section */}
              {blockingGroups.length > 0 && errorTypeFilter !== "NON_BLOCKING" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-red-200" />
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider px-2">
                      Bloqueantes — Impedem Aprovacao
                    </span>
                    <div className="h-px flex-1 bg-red-200" />
                  </div>
                  {blockingGroups.map((group) => (
                    <ErrorGroupCard
                      key={group.key}
                      group={group}
                      isPending={isPending}
                      onDismiss={() => {
                        setActiveErrorGroup(group);
                        setDismissDialogOpen(true);
                      }}
                      onFill={() => {
                        setActiveErrorGroup(group);
                        setFillValue("");
                        setFillDialogOpen(true);
                      }}
                      onDiscardItems={() => {
                        setActiveErrorGroup(group);
                        handleBulkSkipGroupWithConfirm(group);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Non-blocking errors section */}
              {nonBlockingGroups.length > 0 && errorTypeFilter !== "BLOCKING" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-amber-200" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider px-2">
                      Nao-bloqueantes — Nao Impedem Aprovacao
                    </span>
                    <div className="h-px flex-1 bg-amber-200" />
                  </div>
                  {nonBlockingGroups.map((group) => (
                    <ErrorGroupCard
                      key={group.key}
                      group={group}
                      isPending={isPending}
                      onDismiss={() => {
                        setActiveErrorGroup(group);
                        setDismissDialogOpen(true);
                      }}
                      onFill={() => {
                        setActiveErrorGroup(group);
                        setFillValue("");
                        setFillDialogOpen(true);
                      }}
                      onDiscardItems={() => {
                        setActiveErrorGroup(group);
                        handleBulkSkipGroupWithConfirm(group);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Resolved errors section (collapsed) */}
              {resolvedGroups.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-green-200" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider px-2">
                      Resolvidos ({resolvedGroups.length})
                    </span>
                    <div className="h-px flex-1 bg-green-200" />
                  </div>
                  {resolvedGroups.map((group) => (
                    <ErrorGroupCard
                      key={group.key}
                      group={group}
                      isPending={isPending}
                      onDismiss={() => {}}
                      onFill={() => {}}
                      onDiscardItems={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detailed errors table (collapsible) */}
          {allUnresolvedErrors.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowDetailErrors(!showDetailErrors)}
              >
                {showDetailErrors ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                {showDetailErrors ? "Ocultar" : "Ver"} tabela detalhada ({allUnresolvedErrors.length})
              </Button>

              {showDetailErrors && (
                <Card className="mt-2">
                  <CardContent className="pt-4">
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
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDetailErrors.map((err) => (
                            <tr key={err.id} className="border-b">
                              <td className="p-2">
                                <Badge className={MIGRATION_SEVERITY_COLORS[err.severity]}>
                                  {MIGRATION_SEVERITY_LABELS[err.severity]}
                                </Badge>
                              </td>
                              <td className="p-2 font-mono text-xs">{err.code}</td>
                              <td className="p-2 tabular-nums">{err.rowNumber ?? "\u2014"}</td>
                              <td className="p-2 text-xs">
                                {err.entityType ? MIGRATION_ENTITY_TYPE_LABELS[err.entityType] : "\u2014"}
                              </td>
                              <td className="p-2 font-mono text-xs">{err.field ?? "\u2014"}</td>
                              <td className="p-2 text-xs">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {errorsTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          Pagina {safeErrorsPage} de {errorsTotalPages} ({allUnresolvedErrors.length} erros)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safeErrorsPage <= 1}
                            onClick={() => setErrorsPage((p) => Math.max(1, p - 1))}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safeErrorsPage >= errorsTotalPages}
                            onClick={() => setErrorsPage((p) => Math.min(errorsTotalPages, p + 1))}
                          >
                            Proximo
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
                  <Button onClick={handleValidate} disabled={isPending} className="justify-start">
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

      {/* ─── DIALOGS ─────────────────────────────────────────────────── */}

      {/* View Data Dialog */}
      <Dialog open={viewDataOpen} onOpenChange={setViewDataOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Dados da Linha {viewingItem?.rowNumber} —{" "}
              {viewingItem?.entityType ? MIGRATION_ENTITY_TYPE_LABELS[viewingItem.entityType] : ""}
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
            <DialogTitle>Corrigir Linha {correctingItem?.rowNumber}</DialogTitle>
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
                        <p key={e.id} className="text-xs text-red-600 mt-0.5">{e.message}</p>
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

      {/* Dismiss (Ignore Field) Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar Campo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Tem certeza que deseja ignorar o campo{" "}
              <strong>{activeErrorGroup?.impact?.title ?? activeErrorGroup?.field}</strong> em todos
              os {activeErrorGroup?.unresolvedCount} itens afetados?
            </p>
            {activeErrorGroup?.impact && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="font-medium text-amber-800 mb-1">Impacto:</p>
                <p className="text-amber-700">{activeErrorGroup.impact.impact}</p>
              </div>
            )}
            <p className="text-muted-foreground">
              Os erros serao marcados como resolvidos e nao impedirao a importacao.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkDismiss} disabled={isPending}>
              {isPending ? "Ignorando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fill in Batch Dialog */}
      <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preencher em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              Preencher <strong>{activeErrorGroup?.impact?.title ?? activeErrorGroup?.field}</strong>{" "}
              em todos os {activeErrorGroup?.unresolvedCount} itens afetados com o valor:
            </p>
            {activeErrorGroup?.impact?.fillOptions ? (
              <Select
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                className="w-full"
              >
                <option value="">Selecione...</option>
                {activeErrorGroup.impact.fillOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                placeholder="Digite o valor..."
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkFill} disabled={isPending || !fillValue}>
              {isPending ? "Aplicando..." : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip All Error Items Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Itens com Erro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Tem certeza que deseja descartar <strong>todos</strong> os itens com status{" "}
              <Badge variant="destructive" className="text-xs">Erro</Badge>?
            </p>
            <p className="text-muted-foreground">
              Estes itens nao serao importados. Esta acao pode ser revertida revalidando o lote.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkSkip} disabled={isPending}>
              {isPending ? "Descartando..." : "Descartar Itens"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve with Warnings Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar com Avisos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              O lote possui <strong>{approveNonBlockingCount}</strong> aviso{approveNonBlockingCount > 1 ? "s" : ""}{" "}
              nao resolvido{approveNonBlockingCount > 1 ? "s" : ""}. Esses avisos nao impedem a importacao,
              mas indicam campos recomendados que estao ausentes.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-amber-800">
                Os avisos serao automaticamente resolvidos ao aprovar.
              </p>
            </div>
            <p className="text-muted-foreground">Deseja aprovar o lote mesmo assim?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleForceApprove}
              disabled={isPending}
            >
              <Shield className="mr-2 h-4 w-4" />
              {isPending ? "Aprovando..." : "Aprovar Mesmo Assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Error Group Card — individual card in the errors tab                */
/* ──────────────────────────────────────────────────────────────────── */

function ErrorGroupCard({
  group,
  isPending,
  onDismiss,
  onFill,
  onDiscardItems,
}: {
  group: ErrorGroup;
  isPending: boolean;
  onDismiss: () => void;
  onFill: () => void;
  onDiscardItems: () => void;
}) {
  const isResolved = group.unresolvedCount === 0;
  const isBlocking = group.impact?.level === "BLOCKING" || !group.impact;
  const showActions = !isResolved && (group.impact?.suggestedActions || isBlocking);

  return (
    <Card className={cn(
      "transition-all",
      isResolved && "opacity-50",
      !isResolved && isBlocking && "border-red-200 dark:border-red-800",
      !isResolved && !isBlocking && "border-amber-200 dark:border-amber-800",
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                className={cn(
                  "text-xs",
                  isBlocking
                    ? "bg-red-100 text-red-800 border-red-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                )}
              >
                {isBlocking ? "Bloqueante" : "Nao-bloqueante"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{group.code}</span>
              {group.entityType && (
                <Badge variant="outline" className="text-xs">
                  {MIGRATION_ENTITY_TYPE_LABELS[group.entityType]}
                </Badge>
              )}
              {isResolved && (
                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                  <CheckCircle className="mr-1 h-3 w-3" /> Resolvido
                </Badge>
              )}
            </div>

            <h4 className="text-sm font-semibold">
              {group.impact?.title ?? group.field ?? "Erro desconhecido"}
            </h4>

            {group.impact?.explanation && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {group.impact.explanation}
              </p>
            )}

            {group.impact?.impact && !isResolved && (
              <p className="text-xs mt-1">
                <span className="font-medium">Impacto:</span> {group.impact.impact}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {group.unresolvedCount > 0
                ? `${group.unresolvedCount} itens afetados`
                : `${group.count} erros (todos resolvidos)`}
            </p>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {group.impact?.suggestedActions?.includes("IGNORE") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDismiss}
                  disabled={isPending}
                >
                  <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                  Ignorar
                </Button>
              )}
              {group.impact?.suggestedActions?.includes("FILL_BATCH") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFill}
                  disabled={isPending}
                >
                  <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                  Preencher
                </Button>
              )}
              {(group.impact?.suggestedActions?.includes("DISCARD_ITEMS") || !group.impact?.suggestedActions?.includes("IGNORE")) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={onDiscardItems}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Descartar Itens
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Migration stepper — visual progress indicator                      */
/* ──────────────────────────────────────────────────────────────────── */
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
  VALIDATING: 0,
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

  if (currentIdx === -2) return null;

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
