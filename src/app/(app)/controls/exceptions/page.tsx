import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from "@/lib/constants/statuses";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Exception = {
  id: string;
  type: string;
  description: string;
  severity: Severity;
  source: "official" | "staging";
  amount?: number;
  date?: string; // ISO string for safe rendering
};

export default async function ExceptionsPage() {
  const user = await getCurrentUser();

  const exceptions: Exception[] = [];

  // ─── 1. Official entries with unusually large amounts (top 5% outliers) ─────
  const allEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
    },
    orderBy: { amount: "desc" },
    take: 500,
  });

  if (allEntries.length > 10) {
    const amounts = allEntries.map((e) => Number(e.amount)).sort((a, b) => a - b);
    const p95Index = Math.floor(amounts.length * 0.95);
    const p95Value = amounts[p95Index] ?? 0;

    const outliers = allEntries.filter((e) => Number(e.amount) > p95Value && p95Value > 0);
    for (const entry of outliers.slice(0, 10)) {
      exceptions.push({
        id: entry.id,
        type: "Valor atipico",
        description: `Lancamento "${entry.description}" com valor ${formatCurrency(Number(entry.amount))} acima do percentil 95`,
        severity: "HIGH",
        source: "official",
        amount: Number(entry.amount),
        date: entry.date.toISOString(),
      });
    }
  }

  // ─── 2. Staging entries without chart of account (missing classification) ──
  // Note: OfficialEntry.chartOfAccountId is REQUIRED (String, not String?),
  // so official entries always have a chart of account.
  // We check StagingEntry instead, where chartOfAccountId IS optional (String?).
  const unclassifiedStaging = await prisma.stagingEntry.findMany({
    where: {
      tenantId: user.tenantId,
      chartOfAccountId: { equals: null },
      status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
    },
    select: { id: true, description: true, amount: true, date: true },
    take: 20,
  });

  for (const entry of unclassifiedStaging) {
    exceptions.push({
      id: entry.id,
      type: "Classificacao ausente",
      description: `Staging "${entry.description}" sem conta contabil atribuida`,
      severity: "MEDIUM",
      source: "staging",
      amount: Number(entry.amount),
      date: entry.date.toISOString(),
    });
  }

  // ─── 3. Official entries without cost center ───────────────────────────────
  // OfficialEntry.costCenterId is optional (String?), so this query is valid.
  const noCostCenter = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      costCenterId: { equals: null },
      status: { not: "CANCELLED" },
    },
    select: { id: true, description: true, amount: true, date: true },
    take: 20,
  });

  for (const entry of noCostCenter) {
    exceptions.push({
      id: entry.id,
      type: "Centro de custo ausente",
      description: `Lancamento "${entry.description}" sem centro de custo`,
      severity: "LOW",
      source: "official",
      amount: Number(entry.amount),
      date: entry.date.toISOString(),
    });
  }

  // ─── 4. Staging entries stuck too long (pending > 7 days) ──────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const staleStaging = await prisma.stagingEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
      createdAt: { lt: sevenDaysAgo },
    },
    select: { id: true, description: true, amount: true, date: true, createdAt: true },
    take: 20,
  });

  for (const entry of staleStaging) {
    // Avoid duplicating entries already flagged as "Classificacao ausente"
    if (!exceptions.some((ex) => ex.id === entry.id)) {
      exceptions.push({
        id: entry.id,
        type: "Staging parado",
        description: `Staging "${entry.description}" pendente ha mais de 7 dias`,
        severity: "MEDIUM",
        source: "staging",
        amount: Number(entry.amount),
        date: entry.date.toISOString(),
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  exceptions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excecoes"
        description="Lancamentos com valores atipicos ou classificacao incompleta"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold">{exceptions.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total de Excecoes</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-orange-600">
            {exceptions.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Alta Severidade</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">
            {exceptions.filter((e) => e.severity === "MEDIUM" || e.severity === "LOW").length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Media/Baixa</p>
        </Card>
      </div>

      {exceptions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-lg font-medium text-green-600">Sem excecoes!</p>
          <p className="text-muted-foreground">
            Nenhuma excecao detectada nos lancamentos.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="rounded-md border border-border min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Severidade</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Descricao</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Origem</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Data</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exc, idx) => (
                <tr key={`${exc.id}-${idx}`} className="border-b">
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <Badge className={SEVERITY_COLORS[exc.severity]}>
                      {SEVERITY_LABELS[exc.severity]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium whitespace-nowrap">{exc.type}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 max-w-md truncate">
                    {exc.description}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <Badge variant="outline">
                      {exc.source === "official" ? "Oficial" : "Staging"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    {exc.date ? formatDate(exc.date) : "—"}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                    {exc.amount != null ? formatCurrency(exc.amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
