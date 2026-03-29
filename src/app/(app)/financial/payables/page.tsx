import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { PayablesClient } from "./client";

export default async function PayablesPage() {
  const user = await getCurrentUser();

  const entries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      category: "PAYABLE",
    },
    orderBy: { dueDate: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      supplier: { select: { name: true } },
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
    supplier: e.supplier ? { name: e.supplier.name } : null,
    chartOfAccount: e.chartOfAccount
      ? { code: e.chartOfAccount.code, name: e.chartOfAccount.name }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Lancamentos de contas a pagar"
      />
      <PayablesClient data={serialized} />
    </div>
  );
}
