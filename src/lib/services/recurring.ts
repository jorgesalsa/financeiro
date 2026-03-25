import prisma from "@/lib/db";
import { addDays, addWeeks, addMonths, addYears, setDate } from "date-fns";

export async function generateRecurringEntries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rules = await prisma.recurringRule.findMany({
    where: {
      active: true,
      nextGenerationDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
    include: { tenant: true },
  });

  let generated = 0;

  for (const rule of rules) {
    // Get next sequential number for this tenant
    const lastEntry = await prisma.officialEntry.findFirst({
      where: { tenantId: rule.tenantId },
      orderBy: { sequentialNumber: "desc" },
      select: { sequentialNumber: true },
    });
    const nextSeq = (lastEntry?.sequentialNumber ?? 0) + 1;

    await prisma.officialEntry.create({
      data: {
        tenantId: rule.tenantId,
        sequentialNumber: nextSeq,
        date: rule.nextGenerationDate,
        competenceDate: rule.nextGenerationDate,
        description: rule.name,
        amount: rule.amount,
        type: rule.type,
        status: "OPEN",
        category: rule.category,
        chartOfAccountId: rule.chartOfAccountId,
        costCenterId: rule.costCenterId,
        supplierId: rule.supplierId,
        customerId: rule.customerId,
        bankAccountId: rule.bankAccountId,
        paymentMethodId: rule.paymentMethodId,
        dueDate: rule.nextGenerationDate,
        originalDueDate: rule.nextGenerationDate,
        recurringRuleId: rule.id,
        incorporatedById: rule.createdById,
        incorporatedAt: new Date(),
      },
    });

    // Calculate next generation date
    const nextDate = calculateNextDate(rule.nextGenerationDate, rule.frequency, rule.dayOfMonth);
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { nextGenerationDate: nextDate },
    });

    generated++;
  }

  return { generated };
}

function calculateNextDate(
  current: Date,
  frequency: string,
  dayOfMonth: number | null
): Date {
  let next: Date;

  switch (frequency) {
    case "DAILY":
      next = addDays(current, 1);
      break;
    case "WEEKLY":
      next = addWeeks(current, 1);
      break;
    case "BIWEEKLY":
      next = addWeeks(current, 2);
      break;
    case "MONTHLY":
      next = addMonths(current, 1);
      if (dayOfMonth) next = setDate(next, Math.min(dayOfMonth, 28));
      break;
    case "BIMONTHLY":
      next = addMonths(current, 2);
      if (dayOfMonth) next = setDate(next, Math.min(dayOfMonth, 28));
      break;
    case "QUARTERLY":
      next = addMonths(current, 3);
      if (dayOfMonth) next = setDate(next, Math.min(dayOfMonth, 28));
      break;
    case "SEMIANNUAL":
      next = addMonths(current, 6);
      if (dayOfMonth) next = setDate(next, Math.min(dayOfMonth, 28));
      break;
    case "ANNUAL":
      next = addYears(current, 1);
      if (dayOfMonth) next = setDate(next, Math.min(dayOfMonth, 28));
      break;
    default:
      next = addMonths(current, 1);
  }

  return next;
}
