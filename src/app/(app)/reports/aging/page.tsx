import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

const BUCKETS = [
  { label: "A Vencer", min: -999999, max: 0 },
  { label: "1-30 dias", min: 1, max: 30 },
  { label: "31-60 dias", min: 31, max: 60 },
  { label: "61-90 dias", min: 61, max: 90 },
  { label: "90+ dias", min: 91, max: 999999 },
];

function getDaysOverdue(dueDate: Date | string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

export default async function AgingPage() {
  const user = await getCurrentUser();

  const openEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ["OPEN", "PARTIAL"] },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      paidAmount: true,
      category: true,
      dueDate: true,
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  const payables = openEntries.filter((e) => e.category === "PAYABLE");
  const receivables = openEntries.filter((e) => e.category === "RECEIVABLE");

  function bucketize(entries: typeof openEntries) {
    const bucketTotals = BUCKETS.map((b) => ({ ...b, total: 0, count: 0 }));
    for (const entry of entries) {
      const days = getDaysOverdue(entry.dueDate);
      const remaining = Number(entry.amount) - Number(entry.paidAmount ?? 0);
      const bucket = bucketTotals.find(
        (b) => days >= b.min && days <= b.max
      );
      if (bucket) {
        bucket.total += remaining;
        bucket.count += 1;
      }
    }
    return bucketTotals;
  }

  const payableBuckets = bucketize(payables);
  const receivableBuckets = bucketize(receivables);

  const totalPayableOverdue = payableBuckets
    .filter((b) => b.min >= 1)
    .reduce((sum, b) => sum + b.total, 0);
  const totalReceivableOverdue = receivableBuckets
    .filter((b) => b.min >= 1)
    .reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aging Report"
        description="Analise de vencimentos por faixa de atraso"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Total a Pagar Vencido</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {formatCurrency(totalPayableOverdue)}
          </p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Total a Receber Vencido</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">
            {formatCurrency(totalReceivableOverdue)}
          </p>
        </Card>
      </div>

      {/* Payables Aging */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3">Contas a Pagar</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="rounded-md border border-border min-w-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {BUCKETS.map((b) => (
                    <th key={b.label} className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">
                      {b.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  {payableBuckets.map((b) => (
                    <td key={b.label} className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      <div>{formatCurrency(b.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.count} titulo(s)
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold whitespace-nowrap">
                    {formatCurrency(
                      payableBuckets.reduce((sum, b) => sum + b.total, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receivables Aging */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3">Contas a Receber</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="rounded-md border border-border min-w-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {BUCKETS.map((b) => (
                    <th key={b.label} className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium whitespace-nowrap">
                      {b.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  {receivableBuckets.map((b) => (
                    <td key={b.label} className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                      <div>{formatCurrency(b.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.count} titulo(s)
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold whitespace-nowrap">
                    {formatCurrency(
                      receivableBuckets.reduce((sum, b) => sum + b.total, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
