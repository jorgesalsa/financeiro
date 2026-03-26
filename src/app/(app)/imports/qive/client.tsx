"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  testAndSaveQiveCredentials,
  syncQiveNFes,
  deleteQiveConnection,
} from "@/lib/actions/qive";
import { formatDate } from "@/lib/utils/format";
import {
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Key,
  WifiOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QiveConnection = {
  id: string;
  status: string;
  lastSyncAt: string | null;
  lastCursor: string | null;
  executionError: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null; email: string };
};

type SyncBatch = {
  id: string;
  fileName: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  createdAt: string;
  completedAt: string | null;
  importedBy: { name: string | null; email: string };
};

type Props = {
  connections: QiveConnection[];
  batches: SyncBatch[];
};

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: "Ativo",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  ERROR: {
    label: "Erro",
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  DISCONNECTED: {
    label: "Desconectado",
    color: "bg-gray-100 text-gray-800",
    icon: <WifiOff className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-800",
    icon: <WifiOff className="h-3 w-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QiveClient({ connections, batches }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Credentials form state
  const [apiId, setApiId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Loading states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeConnection = connections.find(
    (c) => c.status === "ACTIVE" || c.status === "ERROR"
  );

  // ─── Save Credentials ────────────────────────────────────────────────────

  async function handleSaveCredentials() {
    if (!apiId.trim() || !apiKey.trim()) {
      setFeedback({
        type: "error",
        message: "Preencha o API ID e API Key.",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await testAndSaveQiveCredentials(apiId.trim(), apiKey.trim());
      setFeedback({
        type: "success",
        message: result.updated
          ? "Credenciais atualizadas com sucesso!"
          : "Conexao QIVE configurada com sucesso! Clique em Sincronizar para importar as notas.",
      });
      setApiId("");
      setApiKey("");
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao salvar credenciais.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Sync NFes ────────────────────────────────────────────────────────────

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    setFeedback(null);
    try {
      const result = await syncQiveNFes(connectionId);
      setFeedback({
        type: "success",
        message: `Sincronizacao concluida: ${result.total} notas importadas, ${result.classified} classificadas, ${result.skipped} duplicadas ignoradas.`,
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Erro ao sincronizar.",
      });
    } finally {
      setSyncingId(null);
    }
  }

  // ─── Delete Connection ────────────────────────────────────────────────────

  async function handleDelete(connectionId: string) {
    if (!confirm("Tem certeza que deseja remover esta conexao QIVE?")) return;

    setDeletingId(connectionId);
    try {
      await deleteQiveConnection(connectionId);
      setFeedback({ type: "success", message: "Conexao QIVE removida." });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Erro ao remover conexao.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Setup Card - show when no connection exists */}
      {!activeConnection && (
        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Configurar QIVE
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Insira suas credenciais da API QIVE (Arquivei) para importar
                notas fiscais automaticamente. Obtenha no{" "}
                <a
                  href="https://dashboard.qive.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  painel QIVE
                </a>
                .
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  API ID
                </label>
                <Input
                  type="text"
                  placeholder="Seu API ID"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  API Key
                </label>
                <Input
                  type="password"
                  placeholder="Sua API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveCredentials} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Testar e Conectar
            </Button>
          </div>
        </Card>
      )}

      {/* Active Connection */}
      {activeConnection && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Conexao QIVE</h2>
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-orange-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">QIVE (Arquivei)</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={activeConnection.status} />
                    {activeConnection.lastSyncAt && (
                      <span className="text-xs text-muted-foreground">
                        Ultimo sync: {formatDate(activeConnection.lastSyncAt)}
                      </span>
                    )}
                  </div>
                  {activeConnection.executionError && (
                    <p className="text-xs text-red-600 mt-1">
                      {activeConnection.executionError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSync(activeConnection.id)}
                  disabled={syncingId === activeConnection.id}
                >
                  {syncingId === activeConnection.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sincronizar Notas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(activeConnection.id)}
                  disabled={deletingId === activeConnection.id}
                  className="text-red-600 hover:text-red-700"
                >
                  {deletingId === activeConnection.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Sync History */}
      {batches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Historico de Sincronizacoes
          </h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="rounded-md border border-border min-w-[500px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Data
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Total
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Importadas
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Ignoradas
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDate(batch.createdAt)}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                        {batch.totalRecords}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                        {batch.processedRecords}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                        {batch.errorRecords}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <Badge
                          variant={
                            batch.status === "COMPLETED"
                              ? "default"
                              : batch.status === "FAILED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {batch.status === "COMPLETED"
                            ? "Concluido"
                            : batch.status === "FAILED"
                              ? "Falhou"
                              : batch.status === "PROCESSING"
                                ? "Processando"
                                : batch.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
