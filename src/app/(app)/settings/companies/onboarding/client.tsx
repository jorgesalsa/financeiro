"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createBankAccount } from "@/lib/actions/master-data";
import {
  Building2,
  Landmark,
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  Check,
  FileText,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

interface OnboardingClientProps {
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
}

type BankAccountRow = {
  id: string;
  name: string;
  bankCode: string;
  accountType: "CHECKING" | "SAVINGS";
  agency: string;
  accountNumber: string;
};

const STEPS = [
  { label: "Dados da Empresa", icon: Building2 },
  { label: "Contas Bancárias", icon: Landmark },
  { label: "Pronto!", icon: Settings },
];

export function OnboardingClient({
  tenantId,
  tenantName,
  tenantCnpj,
}: OnboardingClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [logoUrl, setLogoUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  // Step 2 state (bank accounts)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [bankForm, setBankForm] = useState<BankAccountRow>({
    id: "",
    name: "",
    bankCode: "",
    accountType: "CHECKING",
    agency: "",
    accountNumber: "",
  });
  const [savingAccounts, setSavingAccounts] = useState(false);

  function addBankAccount() {
    if (!bankForm.name || !bankForm.bankCode) return;
    setBankAccounts((prev) => [
      ...prev,
      { ...bankForm, id: crypto.randomUUID() },
    ]);
    setBankForm({
      id: "",
      name: "",
      bankCode: "",
      accountType: "CHECKING",
      agency: "",
      accountNumber: "",
    });
  }

  function removeBankAccount(id: string) {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  function handleNextStep2() {
    if (bankAccounts.length === 0) {
      setCurrentStep(2);
      return;
    }
    setSavingAccounts(true);
    startTransition(async () => {
      try {
        for (const account of bankAccounts) {
          await createBankAccount({
            bankName: account.name,
            bankCode: account.bankCode,
            accountType: account.accountType as "CHECKING" | "SAVINGS" | "INVESTMENT",
            agency: account.agency,
            accountNumber: account.accountNumber,
            initialBalance: 0,
            active: true,
          });
        }
        setCurrentStep(2);
      } catch (err: any) {
        alert("Erro ao salvar contas: " + err.message);
      } finally {
        setSavingAccounts(false);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Progress bar */}
      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={step.label} className="flex items-center gap-1 sm:gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 rounded-md px-2 sm:px-3 py-2 text-xs font-medium transition-colors flex-1",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted &&
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
                  !isActive &&
                    !isCompleted &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="hidden sm:inline truncate">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Dados da Empresa */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nome da empresa
              </label>
              <input
                type="text"
                value={tenantName}
                readOnly
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                CNPJ
              </label>
              <input
                type="text"
                value={tenantCnpj || "Não informado"}
                readOnly
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                URL do logo (opcional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contas Bancárias */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Contas Bancárias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nome da conta *
                </label>
                <input
                  type="text"
                  value={bankForm.name}
                  onChange={(e) =>
                    setBankForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Conta Principal"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Código do banco *
                </label>
                <input
                  type="text"
                  value={bankForm.bankCode}
                  onChange={(e) =>
                    setBankForm((f) => ({ ...f, bankCode: e.target.value }))
                  }
                  placeholder="Ex: 001"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Tipo
                </label>
                <select
                  value={bankForm.accountType}
                  onChange={(e) =>
                    setBankForm((f) => ({
                      ...f,
                      accountType: e.target.value as "CHECKING" | "SAVINGS",
                    }))
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="CHECKING">Conta Corrente</option>
                  <option value="SAVINGS">Poupança</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Agência
                </label>
                <input
                  type="text"
                  value={bankForm.agency}
                  onChange={(e) =>
                    setBankForm((f) => ({ ...f, agency: e.target.value }))
                  }
                  placeholder="Ex: 0001"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Número da conta
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) =>
                    setBankForm((f) => ({
                      ...f,
                      accountNumber: e.target.value,
                    }))
                  }
                  placeholder="Ex: 12345-6"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              onClick={addBankAccount}
              disabled={!bankForm.name || !bankForm.bankCode}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>

            {bankAccounts.length > 0 && (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Nome
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Banco
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Conta
                      </th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="px-3 py-2">{a.name}</td>
                        <td className="px-3 py-2">{a.bankCode}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          {a.accountType === "CHECKING"
                            ? "Corrente"
                            : "Poupança"}
                        </td>
                        <td className="px-3 py-2">{a.accountNumber}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeBankAccount(a.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setCurrentStep(0)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={handleNextStep2}
                  disabled={isPending || savingAccounts}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingAccounts ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Próximo
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sucesso */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Empresa configurada com sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              A empresa <strong>{tenantName}</strong> está pronta para uso.
              {bankAccounts.length > 0 && (
                <>
                  {" "}
                  {bankAccounts.length}{" "}
                  {bankAccounts.length === 1
                    ? "conta bancária foi criada"
                    : "contas bancárias foram criadas"}
                  .
                </>
              )}
            </p>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Link
                href="/imports/tax-invoices"
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center hover:bg-muted transition-colors"
              >
                <FileText className="h-6 w-6 text-blue-500" />
                <span className="text-xs font-medium">
                  Importar Notas Fiscais
                </span>
              </Link>
              <Link
                href="/imports/bank-statements"
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center hover:bg-muted transition-colors"
              >
                <CreditCard className="h-6 w-6 text-emerald-500" />
                <span className="text-xs font-medium">Importar Extrato</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="h-6 w-6 text-purple-500" />
                <span className="text-xs font-medium">Ir para Dashboard</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
