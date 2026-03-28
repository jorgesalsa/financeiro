import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import prisma from "@/lib/db";
import TransfersClient from "./client";

export default async function TransfersPage() {
  const user = await getCurrentUser();

  const [transfers, bankAccounts] = await Promise.all([
    prisma.internalTransfer.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { transferDate: "desc" },
      include: {
        sourceAccount: { select: { id: true, bankName: true, accountNumber: true } },
        targetAccount: { select: { id: true, bankName: true, accountNumber: true } },
        createdBy: { select: { name: true } },
      },
      take: 100,
    }),
    prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, bankName: true, accountNumber: true, currentBalance: true },
      orderBy: { bankName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferências Internas"
        description="Transferências entre contas bancárias da empresa"
      />
      <TransfersClient
        transfers={JSON.parse(JSON.stringify(transfers))}
        bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
      />
    </div>
  );
}
