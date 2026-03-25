import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { Role } from "@/generated/prisma";

export default async function GovernancePage() {
  const user = await getCurrentUser();

  const [periodLocks, members, recentActivity] = await Promise.all([
    prisma.periodLock.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        lockedBy: { select: { name: true, email: true } },
      },
      take: 24,
    }),
    prisma.membership.findMany({
      where: { tenantId: user.tenantId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { role: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        userEmail: true,
        action: true,
        tableName: true,
        createdAt: true,
      },
    }),
  ]);

  // Role distribution
  const roleDistribution: Record<string, number> = {};
  for (const m of members) {
    roleDistribution[m.role] = (roleDistribution[m.role] ?? 0) + 1;
  }

  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governanca"
        description="Periodos bloqueados, atividade de usuarios e distribuicao de papeis"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{members.length}</p>
          <p className="text-sm text-muted-foreground">Usuarios Ativos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">
            {periodLocks.length}
          </p>
          <p className="text-sm text-muted-foreground">Periodos Bloqueados</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{recentActivity.length}</p>
          <p className="text-sm text-muted-foreground">Atividades Recentes</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Role Distribution */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Distribuicao de Papeis</h3>
          <div className="space-y-3">
            {Object.entries(roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ROLE_LABELS[role as Role] ?? role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${
                          members.length > 0
                            ? (count / members.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Membros</h4>
            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{m.user.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[m.role as Role] ?? m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Period Locks */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Periodos Bloqueados</h3>
          {periodLocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum periodo bloqueado.
            </p>
          ) : (
            <div className="space-y-2">
              {periodLocks.map((lock) => (
                <div
                  key={lock.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">
                      {monthNames[(lock.month ?? 1) - 1]} {lock.year}
                    </span>
                    {lock.lockedBy && (
                      <p className="text-xs text-muted-foreground">
                        por {lock.lockedBy.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">
                    Bloqueado
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Atividade Recente</h2>
        <div className="rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                <th className="px-4 py-3 text-left font-medium">Acao</th>
                <th className="px-4 py-3 text-left font-medium">Tabela</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma atividade recente.
                  </td>
                </tr>
              ) : (
                recentActivity.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">{log.userEmail}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.tableName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
