import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardData } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { ExpenseBreakdownChart } from "@/components/dashboard/expense-breakdown-chart";
import { AgingChart } from "@/components/dashboard/aging-chart";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[380px] animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">
          Nenhum dado disponivel. Comece cadastrando lancamentos financeiros.
        </p>
      </div>
    );
  }

  const { kpis, revenueExpense, cashFlow, expenseBreakdown, aging } = data;

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Receitas"
          value={formatCurrency(kpis.totalReceitas)}
          subtitle="No mes atual"
          trend={
            kpis.receitasTrend !== null
              ? { value: kpis.receitasTrend, label: "vs mes anterior" }
              : undefined
          }
          icon={<ArrowUpCircle className="h-6 w-6" />}
          variant="success"
        />
        <KpiCard
          title="Total Despesas"
          value={formatCurrency(kpis.totalDespesas)}
          subtitle="No mes atual"
          trend={
            kpis.despesasTrend !== null
              ? { value: kpis.despesasTrend, label: "vs mes anterior" }
              : undefined
          }
          icon={<ArrowDownCircle className="h-6 w-6" />}
          variant="danger"
        />
        <KpiCard
          title="Saldo"
          value={formatCurrency(kpis.saldo)}
          subtitle="Receitas - Despesas"
          icon={<DollarSign className="h-6 w-6" />}
          variant={kpis.saldo >= 0 ? "default" : "danger"}
        />
        <KpiCard
          title="Contas Vencidas"
          value={String(kpis.contasVencidas)}
          subtitle={
            kpis.contasVencidas === 0
              ? "Nenhum titulo vencido"
              : kpis.contasVencidas === 1
                ? "1 titulo vencido"
                : `${kpis.contasVencidas} titulos vencidos`
          }
          icon={<AlertTriangle className="h-6 w-6" />}
          variant={kpis.contasVencidas > 0 ? "warning" : "success"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <RevenueExpenseChart data={revenueExpense} />
        <CashFlowChart data={cashFlow} />
        <ExpenseBreakdownChart data={expenseBreakdown} />
        <AgingChart data={aging} />
      </div>
    </>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  if (!tenantId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">
          Nenhuma empresa vinculada. Contate o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visao geral da situacao financeira"
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
