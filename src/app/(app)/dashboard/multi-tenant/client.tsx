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
} from "lucide-react";

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
  if (tenant.overdueCount > 0) return "border-red-400";
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

  function handleAccess(tenantId: string) {
    startTransition(async () => {
      await switchTenant(tenantId);
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
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
                  <CardTitle className="flex items-center gap-2">
                    {tenant.tenantName}
                    {tenant.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Atual
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tenant.tenantCnpj || "CNPJ nao informado"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {roleLabel(tenant.role)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4">
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
