import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { ReceivablesClient } from "./client";

export default async function ReceivablesPage() {
  const user = await getCurrentUser();

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      category: "RECEIVABLE",
    },
    orderBy: { dueDate: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      customer: { select: { name: true } },
    },
    take: 500,
  });

  const serialized = entries.map((e) => ({
    id: e.id,
    dueDate: e.dueDate ? e.dueDate.toISOString() : null,
    description: e.description,
    amount: Number(e.amount),
    paidAmount: Number(e.paidAmount ?? 0),
    status: e.status,
    customer: e.customer ? { name: e.customer.name } : null,
    chartOfAccount: e.chartOfAccount
      ? { code: e.chartOfAccount.code, name: e.chartOfAccount.name }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description="Lancamentos de contas a receber"
      />
      <ReceivablesClient data={serialized} />
    </div>
  );
}
