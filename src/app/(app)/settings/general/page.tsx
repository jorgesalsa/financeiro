import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

const CLASSIFICATION_FIELD_LABELS: Record<string, string> = {
  CNPJ: "CNPJ",
  DESCRIPTION: "Descricao",
  VALUE_RANGE: "Faixa de Valor",
};

export default async function SettingsGeneralPage() {
  const user = await getCurrentUser();

  const [tenant, classificationRules, periodLocks] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
    }),
    prisma.classificationRule.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { priority: "asc" },
      include: {
        chartOfAccount: { select: { code: true, name: true } },
        costCenter: { select: { code: true, name: true } },
      },
      take: 100,
    }),
    prisma.periodLock.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        lockedBy: { select: { name: true } },
      },
      take: 24,
    }),
  ]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes Gerais"
        description="Informacoes do tenant, regras de classificacao e periodos"
      />

      {/* Tenant Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informacoes da Empresa</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome</label>
            <p className="font-medium">{tenant?.name ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Slug</label>
            <p className="font-mono">{tenant?.slug ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">CNPJ</label>
            <p className="font-mono">{tenant?.cnpj ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Criado em</label>
            <p>{tenant?.createdAt ? formatDate(tenant.createdAt) : "—"}</p>
          </div>
        </div>
      </Card>

      {/* Classification Rules */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Regras de Auto-classificacao
        </h3>
        {classificationRules.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhuma regra de classificacao cadastrada.
          </p>
        ) : (
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Prioridade</th>
                  <th className="px-4 py-3 text-left font-medium">Campo</th>
                  <th className="px-4 py-3 text-left font-medium">Padrao</th>
                  <th className="px-4 py-3 text-left font-medium">Conta Contabil</th>
                  <th className="px-4 py-3 text-left font-medium">Centro Custo</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {classificationRules.map((rule) => (
                  <tr key={rule.id} className="border-b">
                    <td className="px-4 py-3">{rule.priority}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {CLASSIFICATION_FIELD_LABELS[rule.field] ?? rule.field}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {rule.pattern}
                    </td>
                    <td className="px-4 py-3">
                      {rule.chartOfAccount
                        ? `${rule.chartOfAccount.code} - ${rule.chartOfAccount.name}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {rule.costCenter
                        ? `${rule.costCenter.code} - ${rule.costCenter.name}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        {rule.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Period Locks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Periodos</h3>
        {periodLocks.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum periodo gerenciado.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {periodLocks.map((lock) => (
              <div
                key={lock.id}
                className="rounded-lg border p-3 text-center bg-muted border-border"
              >
                <p className="font-medium">
                  {monthNames[(lock.month ?? 1) - 1]} {lock.year}
                </p>
                <Badge
                  className="mt-1"
                  variant="secondary"
                >
                  Bloqueado
                </Badge>
                {lock.lockedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    por {lock.lockedBy.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
