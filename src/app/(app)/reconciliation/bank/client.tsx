"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { RefreshCw, Link2, Unlink } from "lucide-react";
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

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
};

interface BankReconciliationClientProps {
  bankAccounts: BankAccount[];
  unreconciledLines: BankLine[];
  unreconciledEntries: OfficialEntry[];
  stats: {
    total: number;
    reconciled: number;
    pending: number;
    percentage: number;
  };
}

export function BankReconciliationClient({
  bankAccounts,
  unreconciledLines,
  unreconciledEntries,
  stats,
}: BankReconciliationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("ALL");
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

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

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <label className="text-xs sm:text-sm font-medium">Conta Bancaria</label>
          <Select
            value={selectedBankAccount}
            onChange={(e) => setSelectedBankAccount(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="ALL">Todas as Contas</option>
            {bankAccounts.map((ba) => (
              <option key={ba.id} value={ba.id}>
                {ba.bankName} - {ba.accountNumber}
              </option>
            ))}
          </Select>
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
  );
}
