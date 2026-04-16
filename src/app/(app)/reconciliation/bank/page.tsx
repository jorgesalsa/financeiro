import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { listBankAccounts } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { BankReconciliationClient } from "./client";

export default async function BankReconciliationPage() {
  const user = await getCurrentUser();

  const [bankAccounts, unreconciledLines, unreconciledEntries, reviewQueue] =
    await Promise.all([
      listBankAccounts(),
      prisma.bankStatementLine.findMany({
        where: {
          tenantId: user.tenantId,
          reconciliation: null,
        },
        orderBy: { transactionDate: "desc" },
        include: {
          bankAccount: { select: { bankName: true, accountNumber: true } },
        },
        take: 200,
      }),
      prisma.officialEntry.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ["OPEN", "PARTIAL", "OVERDUE"] },
          reconciliations: { none: {} },
        },
        orderBy: { date: "desc" },
        include: {
          supplier: { select: { name: true } },
          customer: { select: { name: true } },
        },
        take: 200,
      }),
      prisma.reconciliation.findMany({
        where: {
          tenantId: user.tenantId,
          requiresHumanReview: true,
          approvedById: null,
        },
        orderBy: { reconciledAt: "desc" },
        include: {
          bankStatementLine: {
            select: { description: true, amount: true, transactionDate: true },
          },
          officialEntry: {
            select: { description: true, amount: true, date: true },
          },
        },
        take: 50,
      }),
    ]);

  // Reconciliation stats
  const totalLines = await prisma.bankStatementLine.count({
    where: { tenantId: user.tenantId },
  });
  const reconciledLines = await prisma.bankStatementLine.count({
    where: {
      tenantId: user.tenantId,
      reconciliation: { isNot: null },
    },
  });

  const stats = {
    total: totalLines,
    reconciled: reconciledLines,
    pending: totalLines - reconciledLines,
    percentage: totalLines > 0 ? Math.round((reconciledLines / totalLines) * 100) : 0,
    pendingReview: reviewQueue.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliacao Bancaria"
        description="Concilie extratos bancarios com lancamentos oficiais"
      />
      <BankReconciliationClient
        bankAccounts={bankAccounts as any[]}
        unreconciledLines={unreconciledLines as any[]}
        unreconciledEntries={unreconciledEntries as any[]}
        reviewQueue={JSON.parse(JSON.stringify(reviewQueue))}
        stats={stats}
      />
    </div>
  );
}
