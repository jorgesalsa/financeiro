"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ArrowRightLeft } from "lucide-react";
import { createTransfer } from "@/lib/actions/transfer";
import { formatCurrency } from "@/lib/utils/format";
import { useRouter } from "next/navigation";

interface Transfer {
  id: string;
  amount: string;
  transferDate: string;
  reference: string | null;
  sourceAccount: { id: string; bankName: string; accountNumber: string };
  targetAccount: { id: string; bankName: string; accountNumber: string };
  createdBy: { name: string | null };
  createdAt: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: string;
}

export default function TransfersClient({
  transfers,
  bankAccounts,
}: {
  transfers: Transfer[];
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createTransfer({
          sourceAccountId: formData.get("sourceAccountId") as string,
          targetAccountId: formData.get("targetAccountId") as string,
          amount: parseFloat(formData.get("amount") as string),
          transferDate: formData.get("transferDate") as string,
          reference: (formData.get("reference") as string) || undefined,
        });
        showFeedback("success", "Transferencia criada com sucesso");
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message);
      }
    });
  }

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Transferencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transferencia Interna</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Conta de Origem *</label>
                <Select name="sourceAccountId" required>
                  <option value="">Selecione...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber} ({formatCurrency(Number(acc.currentBalance))})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Conta de Destino *</label>
                <Select name="targetAccountId" required>
                  <option value="">Selecione...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber} ({formatCurrency(Number(acc.currentBalance))})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input name="transferDate" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Referencia (opcional)</label>
                <Input name="reference" />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Criando..." : "Criar Transferencia"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead></TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Criado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma transferencia encontrada
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.transferDate).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.sourceAccount.bankName}</Badge>
                  </TableCell>
                  <TableCell>
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.targetAccount.bankName}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(t.amount))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.reference || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{t.createdBy.name || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
