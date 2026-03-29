"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { MATCH_BASIS_LABELS } from "@/lib/constants/statuses";
import { RefreshCw, Link2, CheckCircle, AlertTriangle } from "lucide-react";
import { approveReconciliationAction } from "@/lib/actions/reconciliation";
import { useRouter } from "next/navigation";

type BankLine = {
  id: string;
  date: string | Date;
  description: string;
  amount: number;
  transactionType: string;
  bankAccount?: { bankName: string; accountNumber: string } | null;
  bankAccountId: string;
};

type OfficialEntry = {
  id: string;
  date: string | Date;
  description: string;
  amount: number;
  transactionType: string;
  supplier?: { name: string } | null;
  customer?: { name: string } | null;
};

type ReviewItem = {
  id: string;
  matchConfidence: number | null;
  matchBasis: string | null;
  reviewReason: string | null;
  bankStatementLine: { description: string; amount: number | string; transactionDate: string };
  officialEntry: { description: string; amount: number | string; date: string };
};

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
};

interface BankReconciliationClientProps {
  bankAccounts: BankAccount[];
  unreconciledLines: BankLine[];
  unreconciledEntries: OfficialEntry[];
  reviewQueue: ReviewItem[];
  stats: {
    total: number;
    reconciled: number;
    pending: number;
    percentage: number;
    pendingReview: number;
  };
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence == null) return <Badge variant="outline">—</Badge>;
  const color =
    confidence >= 80
      ? "bg-green-100 text-green-800"
      : confidence >= 60
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  return <Badge className={color}>{confidence}%</Badge>;
}

export function BankReconciliationClient({
  bankAccounts,
  unreconciledLines,
  unreconciledEntries,
  reviewQueue,
  stats,
}: BankReconciliationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("ALL");
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"reconcile" | "review">("reconcile");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  const filteredLines =
    selectedBankAccount === "ALL"
      ? unreconciledLines
      : unreconciledLines.filter((l) => l.bankAccountId === selectedBankAccount);

  async function handleAutoReconcile() {
    startTransition(async () => {
      try {
        await fetch("/api/reconciliation/auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankAccountId: selectedBankAccount !== "ALL" ? selectedBankAccount : undefined,
          }),
        });
      } catch {
        // Server action not yet wired up
      }
      router.refresh();
    });
  }

  async function handleManualReconcile() {
    if (!selectedLine || !selectedEntry) return;
    startTransition(async () => {
      try {
        await fetch("/api/reconciliation/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankStatementLineId: selectedLine,
            officialEntryId: selectedEntry,
          }),
        });
      } catch {
        // Server action not yet wired up
      }
      setSelectedLine(null);
      setSelectedEntry(null);
      router.refresh();
    });
  }

  async function handleApproveReview(reconciliationId: string) {
    startTransition(async () => {
      try {
        await approveReconciliationAction(reconciliationId);
        showFeedback("success", "Conciliacao aprovada");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao aprovar");
      }
    });
  }

  return (
    <>
      {/* Feedback banner */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total de Linhas</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.reconciled}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Conciliadas</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold">{stats.percentage}%</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Conciliado</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.pendingReview}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Aguardando Revisao</p>
        </Card>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "reconcile" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("reconcile")}
        >
          Conciliacao
        </Button>
        <Button
          variant={activeView === "review" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("review")}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Fila de Revisao ({reviewQueue.length})
        </Button>
      </div>

      {activeView === "reconcile" ? (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium">Conta Bancaria</label>
              <SearchableSelect
                value={selectedBankAccount}
                onChange={(val) => setSelectedBankAccount(val)}
                placeholder="Todas as Contas"
                className="w-full sm:w-64"
                options={[
                  { value: "ALL", label: "Todas as Contas" },
                  ...bankAccounts.map((ba) => ({
                    value: ba.id,
                    label: `${ba.bankName} - ${ba.accountNumber}`,
                  })),
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAutoReconcile} disabled={isPending} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                {isPending ? "Conciliando..." : "Auto Conciliar"}
              </Button>
              {selectedLine && selectedEntry && (
                <Button onClick={handleManualReconcile} disabled={isPending} variant="outline" size="sm">
                  <Link2 className="mr-2 h-4 w-4" />
                  Conciliar
                </Button>
              )}
            </div>
          </div>

          {/* Split view */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Bank statement lines */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                Extrato Bancario ({filteredLines.length} pendentes)
              </h3>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma linha pendente.
                  </p>
                ) : (
                  filteredLines.map((line) => (
                    <div
                      key={line.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedLine === line.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        setSelectedLine(selectedLine === line.id ? null : line.id)
                      }
                    >
                      <div>
                        <p className="text-sm font-medium">{line.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(line.date)}
                          {line.bankAccount && ` — ${line.bankAccount.bankName}`}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          line.transactionType === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {line.transactionType === "CREDIT" ? "+" : "-"}
                        {formatCurrency(line.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Right: Unreconciled entries */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                Lancamentos ({unreconciledEntries.length} pendentes)
              </h3>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {unreconciledEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum lancamento pendente.
                  </p>
                ) : (
                  unreconciledEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedEntry === entry.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        setSelectedEntry(
                          selectedEntry === entry.id ? null : entry.id
                        )
                      }
                    >
                      <div>
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                          {entry.supplier?.name && ` — ${entry.supplier.name}`}
                          {entry.customer?.name && ` — ${entry.customer.name}`}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          entry.transactionType === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.transactionType === "CREDIT" ? "+" : "-"}
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* Review Queue */
        <Card className="p-4">
          <h3 className="font-semibold mb-3">
            Conciliacoes Aguardando Revisao Humana
          </h3>
          {reviewQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma conciliacao pendente de revisao.
            </p>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge confidence={item.matchConfidence} />
                      {item.matchBasis && (
                        <Badge variant="outline" className="text-xs">
                          {MATCH_BASIS_LABELS[item.matchBasis as keyof typeof MATCH_BASIS_LABELS] ?? item.matchBasis}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApproveReview(item.id)}
                      disabled={isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprovar
                    </Button>
                  </div>
                  {item.reviewReason && (
                    <p className="text-xs text-amber-600">{item.reviewReason}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Extrato</p>
                      <p className="font-medium">{item.bankStatementLine.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.bankStatementLine.transactionDate)} — {formatCurrency(Number(item.bankStatementLine.amount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Lancamento</p>
                      <p className="font-medium">{item.officialEntry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.officialEntry.date)} — {formatCurrency(Number(item.officialEntry.amount))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
