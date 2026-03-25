import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CHECKLIST_STATUS_LABELS,
} from "@/lib/constants/statuses";
import type { ChecklistStatus } from "@/generated/prisma";

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  NOT_APPLICABLE: "bg-gray-100 text-gray-800",
};

export default async function ClosingPage() {
  const user = await getCurrentUser();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const checklists = await prisma.closingChecklist.findMany({
    where: {
      tenantId: user.tenantId,
      year: currentYear,
      month: currentMonth,
    },
    orderBy: { createdAt: "asc" },
    include: {
      completedBy: { select: { name: true } },
    },
  });

  const totalItems = checklists.length;
  const completedItems = checklists.filter(
    (c) => c.status === "COMPLETED"
  ).length;

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fechamento Mensal"
        description={`Checklist de fechamento - ${monthNames[currentMonth - 1]} ${currentYear}`}
      />

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Progresso: {completedItems}/{totalItems} itens
          </span>
          <span className="text-sm text-muted-foreground">
            {totalItems > 0
              ? `${Math.round((completedItems / totalItems) * 100)}%`
              : "0%"}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{
              width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`,
            }}
          />
        </div>
      </Card>

      {/* Checklist items */}
      {checklists.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum item de checklist para este mes.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure os itens de checklist nas configuracoes.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {checklists.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      item.status === "COMPLETED"
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status === "COMPLETED" ? "✓" : "○"}
                  </div>
                  <div>
                    <p className="font-medium">{item.item}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                      CHECKLIST_STATUS_COLORS[item.status] ?? ""
                    }`}
                  >
                    {CHECKLIST_STATUS_LABELS[item.status as ChecklistStatus] ?? item.status}
                  </span>
                  {item.completedBy && (
                    <span className="text-xs text-muted-foreground">
                      por {item.completedBy.name}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
