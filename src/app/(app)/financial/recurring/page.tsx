import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Frequency } from "@/generated/prisma";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

export default async function RecurringPage() {
  const user = await getCurrentUser();

  const rules = await prisma.recurringRule.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { nextGenerationDate: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      costCenter: { select: { code: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lancamentos Recorrentes"
        description="Regras de lancamentos recorrentes automaticos"
      />
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-left font-medium">Frequencia</th>
              <th className="px-4 py-3 text-left font-medium">Proxima Geracao</th>
              <th className="px-4 py-3 text-left font-medium">Conta</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma regra recorrente cadastrada.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(rule.amount))}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {FREQUENCY_LABELS[rule.frequency] ?? rule.frequency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {rule.nextGenerationDate
                      ? formatDate(rule.nextGenerationDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {rule.chartOfAccount
                      ? `${rule.chartOfAccount.code} - ${rule.chartOfAccount.name}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.active ? "default" : "secondary"}>
                      {rule.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
