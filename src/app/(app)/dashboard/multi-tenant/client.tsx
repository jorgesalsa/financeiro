"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchTenant } from "@/lib/actions/tenant";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  AlertTriangle,
  FileCheck,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Clock,
  Tag,
  Layers,
} from "lucide-react";

type ExceptionInfo = {
  unclassified: number;
  staleStaging: number;
  noCostCenter: number;
  total: number;
};

type TenantInfo = {
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  tenantSlug: string;
  role: string;
  isDefault: boolean;
  memberCount: number;
  pendingStaging: number;
  overdueCount: number;
  exceptions: ExceptionInfo;
};

interface MultiTenantDashboardClientProps {
  tenants: TenantInfo[];
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "CONTROLLER":
      return "Controller";
    case "ANALYST":
      return "Analista";
    case "VIEWER":
      return "Visualizador";
    default:
      return role;
  }
}

function cardBorderColor(tenant: TenantInfo) {
  if (tenant.overdueCount > 0 || tenant.exceptions.total > 0)
    return "border-l-red-400";
  if (tenant.pendingStaging > 0) return "border-l-yellow-400";
  return "border-l-emerald-400";
}

export function MultiTenantDashboardClient({
  tenants,
}: MultiTenantDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalEmpresas = tenants.length;
  const totalPendencias = tenants.reduce((s, t) => s + t.pendingStaging, 0);
  const totalVencidas = tenants.reduce((s, t) => s + t.overdueCount, 0);
  const totalExcecoes = tenants.reduce((s, t) => s + t.exceptions.total, 0);

  function handleAccess(tenantId: string) {
    startTransition(async () => {
      await switchTenant(tenantId);
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Summary row — uniform gap-4, labels truncated to avoid wrap */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-950"
          label="Empresas"
          value={totalEmpresas}
        />
        <SummaryCard
          icon={<FileCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-950"
          label="Staging pendente"
          value={totalPendencias}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950"
          label="Contas vencidas"
          value={totalVencidas}
        />
        <SummaryCard
          icon={<ShieldAlert className={cn("h-5 w-5", totalExcecoes > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")} />}
          iconBg={totalExcecoes > 0 ? "bg-amber-50 dark:bg-amber-950" : "bg-emerald-50 dark:bg-emerald-950"}
          label="Exceções"
          value={totalExcecoes}
          highlight={totalExcecoes > 0}
        />
      </div>

      {/* Company cards — same gap-4 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {tenants.map((tenant) => (
          <Card
            key={tenant.tenantId}
            className={cn(
              "border-l-4 transition-shadow hover:shadow-md",
              cardBorderColor(tenant),
              tenant.isDefault && "ring-2 ring-primary/30"
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{tenant.tenantName}</span>
                    {tenant.isDefault && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Atual
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {tenant.tenantCnpj || "CNPJ nao informado"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {roleLabel(tenant.role)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
                <span
                  className={cn(
                    "flex items-center gap-1",
                    tenant.pendingStaging > 0
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                  )}
                >
                  <FileCheck className="h-3.5 w-3.5 shrink-0" />
                  {tenant.pendingStaging} pendencias
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    tenant.overdueCount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {tenant.overdueCount} vencidas
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {tenant.memberCount} membros
                </span>
              </div>

              {/* Exceptions panel */}
              {tenant.exceptions.total > 0 && (
                <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {tenant.exceptions.total} exceções
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                    {tenant.exceptions.unclassified > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3 shrink-0" />
                        {tenant.exceptions.unclassified} sem classif.
                      </span>
                    )}
                    {tenant.exceptions.staleStaging > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {tenant.exceptions.staleStaging} staging parado
                      </span>
                    )}
                    {tenant.exceptions.noCostCenter > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 shrink-0" />
                        {tenant.exceptions.noCostCenter} sem CC
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleAccess(tenant.tenantId)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Acessar
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Extracted KPI summary card – uniform height                        */
/* ------------------------------------------------------------------ */
function SummaryCard({
  icon,
  iconBg,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "ring-1 ring-amber-400 dark:ring-amber-600")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p
              className={cn(
                "text-xl font-bold",
                highlight && "text-amber-600 dark:text-amber-400"
              )}
            >
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
