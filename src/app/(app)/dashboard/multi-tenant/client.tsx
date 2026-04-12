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
    return "border-red-400";
  if (tenant.pendingStaging > 0) return "border-yellow-400";
  return "border-emerald-400";
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
    <div className="space-y-6 min-w-0">
      {/* Summary row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total empresas</p>
                <p className="text-xl font-bold">{totalEmpresas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950">
                <FileCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total pendencias staging
                </p>
                <p className="text-xl font-bold">{totalPendencias}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total contas vencidas
                </p>
                <p className="text-xl font-bold">{totalVencidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            totalExcecoes > 0 && "ring-1 ring-amber-400 dark:ring-amber-600"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  totalExcecoes > 0
                    ? "bg-amber-50 dark:bg-amber-950"
                    : "bg-emerald-50 dark:bg-emerald-950"
                )}
              >
                <ShieldAlert
                  className={cn(
                    "h-5 w-5",
                    totalExcecoes > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total excecoes
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    totalExcecoes > 0 &&
                      "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {totalExcecoes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company cards grid */}
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
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
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
            <CardContent>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
                <span
                  className={cn(
                    "flex items-center gap-1",
                    tenant.pendingStaging > 0
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                  )}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  {tenant.pendingStaging} pendencias no staging
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    tenant.overdueCount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {tenant.overdueCount} contas vencidas
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {tenant.memberCount} membros
                </span>
              </div>

              {/* Exceptions panel */}
              {tenant.exceptions.total > 0 && (
                <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {tenant.exceptions.total} excecoes encontradas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                    {tenant.exceptions.unclassified > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tenant.exceptions.unclassified} sem classificacao
                      </span>
                    )}
                    {tenant.exceptions.staleStaging > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tenant.exceptions.staleStaging} staging parado
                      </span>
                    )}
                    {tenant.exceptions.noCostCenter > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {tenant.exceptions.noCostCenter} sem centro de custo
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
