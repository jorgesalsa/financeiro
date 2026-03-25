"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { PluggyConnect } from "react-pluggy-connect";
import {
  createConnectToken,
  savePluggyConnection,
  linkPluggyAccount,
  syncPluggyTransactions,
  deletePluggyConnection,
} from "@/lib/actions/pluggy";
import { formatDate } from "@/lib/utils/format";
import {
  Plug,
  RefreshCw,
  Link2,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  WifiOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Connection = {
  id: string;
  pluggyItemId: string;
  connectorId: number;
  connectorName: string;
  connectorLogo: string | null;
  status: string;
  lastSyncAt: string | null;
  executionError: string | null;
  bankAccountId: string | null;
  pluggyAccountId: string | null;
  bankAccount: {
    id: string;
    bankName: string;
    accountNumber: string;
    agency: string;
  } | null;
  createdAt: string;
};

type BankAccount = {
  id: string;
  bankName: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountType: string;
  active: boolean;
};

type PluggyAccount = {
  id: string;
  name: string;
  number: string;
  type: string;
  balance: number;
  currencyCode: string;
};

type SyncBatch = {
  id: string;
  fileName: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  importedBy: string;
  createdAt: string;
  completedAt: string | null;
};

type Props = {
  connections: Connection[];
  bankAccounts: BankAccount[];
  syncBatches: SyncBatch[];
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  UPDATED: {
    label: "Conectado",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  OUTDATED: {
    label: "Desatualizado",
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="h-3 w-3" />,
  },
  ERROR: {
    label: "Erro",
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  LOGIN_IN_PROGRESS: {
    label: "Conectando...",
    color: "bg-blue-100 text-blue-800",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  WAITING_USER_INPUT: {
    label: "Aguardando",
    color: "bg-orange-100 text-orange-800",
    icon: <Clock className="h-3 w-3" />,
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

export function PluggyConnectionsClient({
  connections,
  bankAccounts,
  syncBatches,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Widget state
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Link dialog state
  const [linkDialog, setLinkDialog] = useState<{
    connectionId: string;
    pluggyAccounts: PluggyAccount[];
  } | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [selectedPluggyAccountId, setSelectedPluggyAccountId] = useState("");

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Loading states for individual actions
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Connect New Bank ───────────────────────────────────────────────────

  async function handleConnectBank() {
    setIsLoadingToken(true);
    setFeedback(null);
    try {
      const token = await createConnectToken();
      setConnectToken(token);
      setIsWidgetOpen(true);
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Erro ao gerar token de conexao. Verifique as credenciais Pluggy.",
      });
    } finally {
      setIsLoadingToken(false);
    }
  }

  async function handleWidgetSuccess(data: { item: { id: string } }) {
    setIsWidgetOpen(false);
    setConnectToken(null);

    try {
      const result = await savePluggyConnection(data.item.id);

      if (result.accounts.length > 0) {
        setLinkDialog({
          connectionId: result.connection.id,
          pluggyAccounts: result.accounts as PluggyAccount[],
        });
      }

      setFeedback({ type: "success", message: "Banco conectado com sucesso!" });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Erro ao salvar conexao.",
      });
    }
  }

  // ─── Link Account ───────────────────────────────────────────────────────

  async function handleLinkAccount() {
    if (!linkDialog || !selectedBankAccountId || !selectedPluggyAccountId) return;

    try {
      await linkPluggyAccount(
        linkDialog.connectionId,
        selectedBankAccountId,
        selectedPluggyAccountId
      );
      setFeedback({ type: "success", message: "Conta vinculada com sucesso!" });
      setLinkDialog(null);
      setSelectedBankAccountId("");
      setSelectedPluggyAccountId("");
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao vincular conta." });
    }
  }

  // ─── Sync Transactions ──────────────────────────────────────────────────

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    setFeedback(null);
    try {
      const result = await syncPluggyTransactions(connectionId);
      setFeedback({
        type: "success",
        message: `Sincronizacao concluida: ${result.total} transacoes importadas, ${result.classified} classificadas, ${result.skipped} duplicadas ignoradas.`,
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

  // ─── Delete Connection ──────────────────────────────────────────────────

  async function handleDelete(connectionId: string) {
    if (!confirm("Tem certeza que deseja remover esta conexao?")) return;

    setDeletingId(connectionId);
    try {
      await deletePluggyConnection(connectionId);
      setFeedback({ type: "success", message: "Conexao removida." });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao remover conexao." });
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Open Link Dialog for existing connection ───────────────────────────

  async function handleOpenLinkDialog(connectionId: string) {
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection) return;

    setIsLoadingToken(true);
    try {
      // Fetch accounts from Pluggy
      const result = await savePluggyConnection(connection.pluggyItemId);
      setLinkDialog({
        connectionId,
        pluggyAccounts: result.accounts as PluggyAccount[],
      });
    } catch {
      setFeedback({ type: "error", message: "Erro ao buscar contas." });
    } finally {
      setIsLoadingToken(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const activeBankAccounts = bankAccounts.filter((ba) => ba.active);

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

      {/* Connect Button */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Conectar Novo Banco</h3>
            <p className="text-sm text-muted-foreground">
              Use o Open Banking para conectar sua conta bancaria automaticamente
            </p>
          </div>
          <Button onClick={handleConnectBank} disabled={isLoadingToken}>
            {isLoadingToken ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            Conectar Banco
          </Button>
        </div>
      </Card>

      {/* Pluggy Connect Widget */}
      {isWidgetOpen && connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={true}
          onSuccess={handleWidgetSuccess}
          onError={(error: { message: string; data?: { item?: { id: string } } }) => {
            setIsWidgetOpen(false);
            setConnectToken(null);
            setFeedback({
              type: "error",
              message: `Erro na conexao: ${error.message}`,
            });
          }}
          onClose={() => {
            setIsWidgetOpen(false);
            setConnectToken(null);
          }}
        />
      )}

      {/* Active Connections */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Conexoes Ativas</h2>
        {connections.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              Nenhuma conexao bancaria configurada. Clique em &quot;Conectar
              Banco&quot; para comecar.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {connections.map((conn) => (
              <Card key={conn.id} className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {conn.connectorLogo ? (
                      <img
                        src={conn.connectorLogo}
                        alt={conn.connectorName}
                        className="h-8 w-8 rounded-md object-contain"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Plug className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{conn.connectorName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <StatusBadge status={conn.status} />
                        {conn.bankAccount ? (
                          <Badge variant="outline" className="text-xs">
                            {conn.bankAccount.bankName} -{" "}
                            {conn.bankAccount.accountNumber}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Nao vinculada
                          </Badge>
                        )}
                        {conn.lastSyncAt && (
                          <span className="text-xs text-muted-foreground">
                            Ultimo sync: {formatDate(conn.lastSyncAt)}
                          </span>
                        )}
                      </div>
                      {conn.executionError && (
                        <p className="text-xs text-red-600 mt-1">
                          {conn.executionError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!conn.bankAccountId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLinkDialog(conn.id)}
                        disabled={isLoadingToken}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Vincular
                      </Button>
                    )}
                    {conn.bankAccountId && conn.pluggyAccountId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                      >
                        {syncingId === conn.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sincronizar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(conn.id)}
                      disabled={deletingId === conn.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deletingId === conn.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sync History */}
      {syncBatches.length > 0 && (
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
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Origem
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Total
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Importados
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">
                      Ignorados
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {syncBatches.map((batch) => (
                    <tr key={batch.id} className="border-b">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDate(batch.createdAt)}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        {batch.fileName}
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

      {/* Link Account Dialog */}
      <Dialog
        open={!!linkDialog}
        onOpenChange={(open) => {
          if (!open) {
            setLinkDialog(null);
            setSelectedBankAccountId("");
            setSelectedPluggyAccountId("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Conta Bancaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Conta no Pluggy
              </label>
              <Select
                value={selectedPluggyAccountId}
                onChange={(e) => setSelectedPluggyAccountId(e.target.value)}
              >
                <option value="">Selecione a conta do banco</option>
                {linkDialog?.pluggyAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} - {acc.number} ({acc.type})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Conta no Sistema
              </label>
              <Select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
              >
                <option value="">Selecione a conta cadastrada</option>
                {activeBankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.bankName} - Ag {ba.agency} / CC {ba.accountNumber}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkDialog(null);
                setSelectedBankAccountId("");
                setSelectedPluggyAccountId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={!selectedBankAccountId || !selectedPluggyAccountId}
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
