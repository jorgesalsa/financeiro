import prisma from "@/lib/db";
import type { ClassificationRule, StagingEntry } from "@/generated/prisma";

interface ClassificationResult {
  chartOfAccountId?: string;
  costCenterId?: string;
  supplierId?: string;
  customerId?: string;
}

export async function autoClassify(
  tenantId: string,
  entry: { counterpartCnpjCpf?: string | null; description: string; amount: number }
): Promise<ClassificationResult | null> {
  const rules = await prisma.classificationRule.findMany({
    where: { tenantId, active: true },
    orderBy: { priority: "asc" },
  });

  for (const rule of rules) {
    if (matchesRule(rule, entry)) {
      return {
        chartOfAccountId: rule.chartOfAccountId ?? undefined,
        costCenterId: rule.costCenterId ?? undefined,
        supplierId: rule.supplierId ?? undefined,
        customerId: rule.customerId ?? undefined,
      };
    }
  }

  return null;
}

function matchesRule(
  rule: ClassificationRule,
  entry: { counterpartCnpjCpf?: string | null; description: string; amount: number }
): boolean {
  switch (rule.field) {
    case "CNPJ":
      if (!entry.counterpartCnpjCpf) return false;
      return entry.counterpartCnpjCpf.replace(/\D/g, "") === rule.pattern.replace(/\D/g, "");

    case "DESCRIPTION":
      return entry.description.toLowerCase().includes(rule.pattern.toLowerCase());

    case "VALUE_RANGE": {
      // Pattern format: "min-max" e.g. "100-500"
      const [minStr, maxStr] = rule.pattern.split("-");
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (isNaN(min) || isNaN(max)) return false;
      return entry.amount >= min && entry.amount <= max;
    }

    default:
      return false;
  }
}

export async function classifyStagingEntries(tenantId: string, entryIds: string[]) {
  const entries = await prisma.stagingEntry.findMany({
    where: { id: { in: entryIds }, tenantId, status: "PENDING" },
  });

  let classified = 0;

  for (const entry of entries) {
    const result = await autoClassify(tenantId, {
      counterpartCnpjCpf: entry.counterpartCnpjCpf,
      description: entry.description,
      amount: Number(entry.amount),
    });

    if (result) {
      await prisma.stagingEntry.update({
        where: { id: entry.id },
        data: {
          ...result,
          status: "AUTO_CLASSIFIED",
        },
      });
      classified++;
    }
  }

  return { total: entries.length, classified };
}
