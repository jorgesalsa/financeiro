import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from "@/lib/constants/statuses";

type CheckResult = {
  name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  count: number;
};

export default async function DailyCheckPage() {
  const user = await getCurrentUser();

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Run checks
  const checks: CheckResult[] = [];

  // 1. Unreconciled bank statement lines
  const unreconciledLines = await prisma.bankStatementLine.count({
    where: {
      tenantId: user.tenantId,
      reconciliation: { is: null },
    },
  });
  if (unreconciledLines > 0) {
    checks.push({
      name: "Linhas de extrato nao conciliadas",
      description: `${unreconciledLines} linha(s) de extrato bancario sem conciliacao`,
      severity: unreconciledLines > 50 ? "HIGH" : unreconciledLines > 10 ? "MEDIUM" : "LOW",
      count: unreconciledLines,
    });
  }

  // 2. Overdue entries
  const overdueEntries = await prisma.officialEntry.count({
    where: {
      tenantId: user.tenantId,
      status: { in: ["OPEN", "PARTIAL"] },
      dueDate: { lt: today },
    },
  });
  if (overdueEntries > 0) {
    checks.push({
      name: "Lancamentos vencidos",
      description: `${overdueEntries} lancamento(s) com vencimento ultrapassado`,
      severity: overdueEntries > 20 ? "CRITICAL" : overdueEntries > 5 ? "HIGH" : "MEDIUM",
      count: overdueEntries,
    });
  }

  // 3. Pending staging entries
  const pendingStaging = await prisma.stagingEntry.count({
    where: {
      tenantId: user.tenantId,
      status: { in: ["PENDING", "AUTO_CLASSIFIED"] },
    },
  });
  if (pendingStaging > 0) {
    checks.push({
      name: "Staging pendente de validacao",
      description: `${pendingStaging} lancamento(s) no staging aguardando validacao`,
      severity: pendingStaging > 30 ? "HIGH" : pendingStaging > 10 ? "MEDIUM" : "LOW",
      count: pendingStaging,
    });
  }

  // 4. Entries without chart of account
  const noAccount = await prisma.officialEntry.count({
    where: {
      tenantId: user.tenantId,
      chartOfAccountId: { equals: null } as any,
      status: { not: "CANCELLED" },
    },
  });
  if (noAccount > 0) {
    checks.push({
      name: "Lancamentos sem conta contabil",
      description: `${noAccount} lancamento(s) sem classificacao de conta contabil`,
      severity: "MEDIUM",
      count: noAccount,
    });
  }

  // 5. Zero-balance bank accounts
  const zeroBalance = await prisma.bankAccount.count({
    where: {
      tenantId: user.tenantId,
      active: true,
      currentBalance: 0,
    },
  });
  if (zeroBalance > 0) {
    checks.push({
      name: "Contas bancarias com saldo zero",
      description: `${zeroBalance} conta(s) bancaria(s) ativa(s) com saldo zero`,
      severity: "LOW",
      count: zeroBalance,
    });
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  checks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = checks.filter((c) => c.severity === "CRITICAL").length;
  const highCount = checks.filter((c) => c.severity === "HIGH").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verificacao Diaria"
        description="Checagem automatica de pendencias e inconsistencias"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold">{checks.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Total de Alertas</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Criticos</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{highCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Altos</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {checks.length === 0 ? "OK" : checks.length - criticalCount - highCount}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Outros</p>
        </Card>
      </div>

      {/* Results */}
      {checks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-lg font-medium text-green-600">
            Tudo certo!
          </p>
          <p className="text-muted-foreground">
            Nenhuma pendencia ou inconsistencia detectada.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {checks.map((check, i) => (
            <Card key={i} className="p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3 sm:items-center justify-between">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Badge className={`shrink-0 ${SEVERITY_COLORS[check.severity]}`}>
                    {SEVERITY_LABELS[check.severity]}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">{check.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {check.description}
                    </p>
                  </div>
                </div>
                <span className="text-lg sm:text-2xl font-bold text-muted-foreground shrink-0">
                  {check.count}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
