import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";
import type { AuditAction } from "@/generated/prisma";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criacao",
  UPDATE: "Alteracao",
  DELETE: "Exclusao",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    tableName?: string;
    action?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const where: any = { tenantId: user.tenantId };
  if (params.tableName) where.tableName = params.tableName;
  if (params.action) where.action = params.action;
  if (params.userId) where.userId = params.userId;
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
    if (params.dateTo) where.createdAt.lte = new Date(params.dateTo + "T23:59:59");
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Get distinct table names for filter
  const tableNames = await prisma.auditLog.findMany({
    where: { tenantId: user.tenantId },
    distinct: ["tableName"],
    select: { tableName: true },
    orderBy: { tableName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de Auditoria"
        description="Historico de alteracoes no sistema"
      />

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium">Tabela</label>
          <select
            name="tableName"
            defaultValue={params.tableName ?? ""}
            className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Todas</option>
            {tableNames.map((t) => (
              <option key={t.tableName} value={t.tableName}>
                {t.tableName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Acao</label>
          <select
            name="action"
            defaultValue={params.action ?? ""}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Todas</option>
            <option value="CREATE">Criacao</option>
            <option value="UPDATE">Alteracao</option>
            <option value="DELETE">Exclusao</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Data de</label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={params.dateFrom ?? ""}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Data ate</label>
          <input
            type="date"
            name="dateTo"
            defaultValue={params.dateTo ?? ""}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Filtrar
        </button>
      </form>

      {/* Table */}
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
              <th className="px-4 py-3 text-left font-medium">Usuario</th>
              <th className="px-4 py-3 text-left font-medium">Tabela</th>
              <th className="px-4 py-3 text-left font-medium">Acao</th>
              <th className="px-4 py-3 text-left font-medium">Registro</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum registro de auditoria encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">{log.userEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.tableName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        ACTION_COLORS[log.action] ?? ""
                      }`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.recordId.substring(0, 8)}...
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
