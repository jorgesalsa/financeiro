import prisma from "@/lib/db";
import type { ClassificationRule } from "@/generated/prisma";

// RA03: Extended classification result
interface ClassificationResult {
  chartOfAccountId?: string;
  costCenterId?: string;
  supplierId?: string;
  customerId?: string;
  confidence: number;
  ruleId: string;
  actionType: string;
}

export async function autoClassify(
  tenantId: string,
  entry: { counterpartCnpjCpf?: string | null; description: string; amount: number }
): Promise<ClassificationResult | null> {
  const rules = await prisma.classificationRule.findMany({
    where: { tenantId, active: true },
    orderBy: { priority: "asc" },
  });

  const matchingResults: ClassificationResult[] = [];

  for (const rule of rules) {
    if (matchesRule(rule, entry)) {
      matchingResults.push({
        chartOfAccountId: rule.chartOfAccountId ?? undefined,
        costCenterId: rule.costCenterId ?? undefined,
        supplierId: rule.supplierId ?? undefined,
        customerId: rule.customerId ?? undefined,
        confidence: rule.confidence,
        ruleId: rule.id,
        actionType: rule.actionType,
      });
    }
  }

  if (matchingResults.length === 0) return null;

  // Return highest-priority (first) match
  return matchingResults[0];
}

// RA03: Detect conflicts (multiple rules with different classification)
export async function autoClassifyWithConflictDetection(
  tenantId: string,
  entry: { counterpartCnpjCpf?: string | null; description: string; amount: number }
): Promise<{
  result: ClassificationResult | null;
  hasConflict: boolean;
  allMatches: ClassificationResult[];
}> {
  const rules = await prisma.classificationRule.findMany({
    where: { tenantId, active: true },
    orderBy: { priority: "asc" },
  });

  const matchingResults: ClassificationResult[] = [];

  for (const rule of rules) {
    if (matchesRule(rule, entry)) {
      matchingResults.push({
        chartOfAccountId: rule.chartOfAccountId ?? undefined,
        costCenterId: rule.costCenterId ?? undefined,
        supplierId: rule.supplierId ?? undefined,
        customerId: rule.customerId ?? undefined,
        confidence: rule.confidence,
        ruleId: rule.id,
        actionType: rule.actionType,
      });
    }
  }

  if (matchingResults.length === 0) {
    return { result: null, hasConflict: false, allMatches: [] };
  }

  // RA03: Detect conflict — multiple CLASSIFY rules with different chartOfAccountId
  const classifyRules = matchingResults.filter((r) => r.actionType === "CLASSIFY");
  const uniqueAccounts = new Set(classifyRules.map((r) => r.chartOfAccountId).filter(Boolean));
  const hasConflict = uniqueAccounts.size > 1;

  return {
    result: matchingResults[0],
    hasConflict,
    allMatches: matchingResults,
  };
}

function matchesRule(
  rule: ClassificationRule,
  entry: { counterpartCnpjCpf?: string | null; description: string; amount: number }
): boolean {
  const conditions: boolean[] = [];

  // Primary field match
  switch (rule.field) {
    case "CNPJ":
      if (!entry.counterpartCnpjCpf) return false;
      conditions.push(
        entry.counterpartCnpjCpf.replace(/\D/g, "") === rule.pattern.replace(/\D/g, "")
      );
      break;

    case "DESCRIPTION":
      conditions.push(
        entry.description.toLowerCase().includes(rule.pattern.toLowerCase())
      );
      break;

    case "VALUE_RANGE": {
      const [minStr, maxStr] = rule.pattern.split("-");
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (isNaN(min) || isNaN(max)) return false;
      conditions.push(entry.amount >= min && entry.amount <= max);
      break;
    }

    default:
      return false;
  }

  // RA03: Additional conditions (minAmount, maxAmount, supplierPattern, datePattern)
  if (rule.minAmount !== null && rule.minAmount !== undefined) {
    conditions.push(entry.amount >= Number(rule.minAmount));
  }
  if (rule.maxAmount !== null && rule.maxAmount !== undefined) {
    conditions.push(entry.amount <= Number(rule.maxAmount));
  }
  if (rule.supplierPattern) {
    const cnpj = entry.counterpartCnpjCpf?.replace(/\D/g, "") ?? "";
    conditions.push(cnpj.includes(rule.supplierPattern.replace(/\D/g, "")));
  }

  // RA03: AND/OR logic
  if (rule.conditionType === "OR") {
    return conditions.some(Boolean);
  }
  return conditions.every(Boolean); // AND (default)
}

export async function classifyStagingEntries(tenantId: string, entryIds: string[]) {
  const entries = await prisma.stagingEntry.findMany({
    where: {
      id: { in: entryIds },
      tenantId,
      status: { in: ["PENDING", "PARSED", "NORMALIZED"] },
    },
  });

  let classified = 0;
  let conflicts = 0;

  for (const entry of entries) {
    const { result, hasConflict } = await autoClassifyWithConflictDetection(tenantId, {
      counterpartCnpjCpf: entry.counterpartCnpjCpf,
      description: entry.description,
      amount: Number(entry.amount),
    });

    if (hasConflict) {
      // RA02+RA03: CONFLICT status when multiple rules disagree
      await prisma.stagingEntry.update({
        where: { id: entry.id },
        data: {
          status: "CONFLICT",
          classificationStatus: "CONFLICT",
        },
      });
      conflicts++;
    } else if (result) {
      await prisma.stagingEntry.update({
        where: { id: entry.id },
        data: {
          chartOfAccountId: result.chartOfAccountId ?? undefined,
          costCenterId: result.costCenterId ?? undefined,
          supplierId: result.supplierId ?? undefined,
          customerId: result.customerId ?? undefined,
          status: "AUTO_CLASSIFIED",
          classificationStatus: "CLASSIFIED",
        },
      });
      classified++;
    }
  }

  return { total: entries.length, classified, conflicts };
}
