/**
 * Aging Report Service
 *
 * Extracts aging calculation logic from the page component into
 * a reusable server-side service with proper UTC timezone handling.
 */

import prisma from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgingBucket {
  label: string;
  min: number;
  max: number;
  total: number;
  count: number;
}

export interface AgingResult {
  payableBuckets: AgingBucket[];
  receivableBuckets: AgingBucket[];
  totalPayableOverdue: number;
  totalReceivableOverdue: number;
  totalPayable: number;
  totalReceivable: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const AGING_BUCKETS = [
  { label: "A Vencer", min: -999999, max: 0 },
  { label: "1-30 dias", min: 1, max: 30 },
  { label: "31-60 dias", min: 31, max: 60 },
  { label: "61-90 dias", min: 61, max: 90 },
  { label: "90+ dias", min: 91, max: 999999 },
] as const;

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Calculate days overdue using UTC-normalized dates.
 * Prevents timezone-related off-by-one errors.
 */
export function getDaysOverdue(dueDate: Date | string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

/**
 * Bucketize entries into aging ranges.
 */
function bucketize(
  entries: Array<{
    amount: unknown;
    paidAmount: unknown;
    dueDate: Date | null;
  }>,
): AgingBucket[] {
  const bucketTotals = AGING_BUCKETS.map((b) => ({
    ...b,
    total: 0,
    count: 0,
  }));

  for (const entry of entries) {
    const days = getDaysOverdue(entry.dueDate);
    const remaining = Number(entry.amount) - Number(entry.paidAmount ?? 0);
    const bucket = bucketTotals.find(
      (b) => days >= b.min && days <= b.max,
    );
    if (bucket) {
      bucket.total += remaining;
      bucket.count += 1;
    }
  }

  return bucketTotals;
}

/**
 * Calculate the full aging report for a given tenant.
 */
export async function calculateAging(tenantId: string): Promise<AgingResult> {
  const openEntries = await prisma.officialEntry.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "PARTIAL", "OVERDUE"] },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      paidAmount: true,
      category: true,
      dueDate: true,
    },
  });

  const payables = openEntries.filter((e) => e.category === "PAYABLE");
  const receivables = openEntries.filter((e) => e.category === "RECEIVABLE");

  const payableBuckets = bucketize(payables);
  const receivableBuckets = bucketize(receivables);

  const totalPayableOverdue = payableBuckets
    .filter((b) => b.min >= 1)
    .reduce((sum, b) => sum + b.total, 0);
  const totalReceivableOverdue = receivableBuckets
    .filter((b) => b.min >= 1)
    .reduce((sum, b) => sum + b.total, 0);

  const totalPayable = payableBuckets.reduce((sum, b) => sum + b.total, 0);
  const totalReceivable = receivableBuckets.reduce((sum, b) => sum + b.total, 0);

  return {
    payableBuckets,
    receivableBuckets,
    totalPayableOverdue,
    totalReceivableOverdue,
    totalPayable,
    totalReceivable,
  };
}
