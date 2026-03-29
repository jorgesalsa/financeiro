import prisma from "@/lib/db";

interface ValidationResult {
  ruleId: string;
  ruleName: string;
  actionType: string;
  message: string;
  passed: boolean;
}

// RA03: Execute validation rules against entries
export async function executeValidationRules(
  tenantId: string,
  entry: {
    amount: number;
    description: string;
    date: Date;
    counterpartCnpjCpf?: string | null;
    chartOfAccountId?: string | null;
  }
): Promise<ValidationResult[]> {
  const rules = await prisma.validationRule.findMany({
    where: { tenantId, active: true },
  });

  const results: ValidationResult[] = [];

  for (const rule of rules) {
    const config = rule.config as Record<string, unknown>;
    let passed = true;
    let message = "";

    switch (rule.ruleType) {
      case "MAX_AMOUNT": {
        const maxAmount = Number(config.maxAmount ?? 0);
        passed = entry.amount <= maxAmount;
        message = passed
          ? `Valor dentro do limite (max: R$ ${maxAmount.toFixed(2)})`
          : `Valor R$ ${entry.amount.toFixed(2)} excede limite de R$ ${maxAmount.toFixed(2)}`;
        break;
      }

      case "REQUIRED_ACCOUNT": {
        passed = !!entry.chartOfAccountId;
        message = passed
          ? "Categoria informada"
          : "Categoria é obrigatória para este tipo de lançamento";
        break;
      }

      case "DESCRIPTION_PATTERN": {
        const pattern = String(config.pattern ?? "");
        if (pattern) {
          const regex = new RegExp(pattern, "i");
          passed = regex.test(entry.description);
          message = passed
            ? `Descrição confere com padrão esperado`
            : `Descrição não confere com padrão: ${pattern}`;
        }
        break;
      }

      case "DATE_RANGE": {
        const minDate = config.minDate ? new Date(String(config.minDate)) : null;
        const maxDate = config.maxDate ? new Date(String(config.maxDate)) : null;
        if (minDate && entry.date < minDate) {
          passed = false;
          message = `Data anterior ao mínimo permitido`;
        } else if (maxDate && entry.date > maxDate) {
          passed = false;
          message = `Data posterior ao máximo permitido`;
        } else {
          message = `Data dentro do intervalo permitido`;
        }
        break;
      }

      case "DUPLICATE_CHECK": {
        const tolerance = Number(config.toleranceDays ?? 0);
        const dateFrom = new Date(entry.date);
        dateFrom.setDate(dateFrom.getDate() - tolerance);
        const dateTo = new Date(entry.date);
        dateTo.setDate(dateTo.getDate() + tolerance);

        const existingCount = await prisma.officialEntry.count({
          where: {
            tenantId,
            amount: entry.amount,
            description: { contains: entry.description.substring(0, 20) },
            date: { gte: dateFrom, lte: dateTo },
          },
        });
        passed = existingCount === 0;
        message = passed
          ? "Nenhum duplicado encontrado"
          : `Possível duplicidade: ${existingCount} lançamentos similares encontrados`;
        break;
      }

      default:
        message = `Tipo de regra desconhecido: ${rule.ruleType}`;
        break;
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      actionType: rule.actionType,
      message,
      passed,
    });
  }

  return results;
}
