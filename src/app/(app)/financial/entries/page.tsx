import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { listBankAccounts, listPaymentMethods } from "@/lib/actions/master-data";
import { EntriesClient } from "./client";

export default async function EntriesPage() {
  const user = await getCurrentUser();

  const [entries, bankAccounts, paymentMethods] = await Promise.all([
    prisma.officialEntry.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { date: "desc" },
      include: {
        chartOfAccount: { select: { code: true, name: true } },
        costCenter: { select: { code: true, name: true } },
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
        settlements: { select: { id: true, amount: true, date: true } },
      },
      take: 200,
    }),
    listBankAccounts(),
    listPaymentMethods(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lancamentos Oficiais"
        description="Gerencie todos os lancamentos financeiros"
      />
      <EntriesClient
        data={entries as any[]}
        bankAccounts={bankAccounts as any[]}
        paymentMethods={paymentMethods as any[]}
      />
    </div>
  );
}
