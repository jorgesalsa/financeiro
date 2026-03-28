import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import prisma from "@/lib/db";
import ClassificationRulesClient from "./client";

export default async function ClassificationRulesPage() {
  const user = await getCurrentUser();

  const [classificationRules, validationRules, chartOfAccounts, costCenters, suppliers, customers] = await Promise.all([
    prisma.classificationRule.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { priority: "asc" },
      include: {
        chartOfAccount: { select: { code: true, name: true } },
        costCenter: { select: { code: true, name: true } },
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
    prisma.validationRule.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chartOfAccount.findMany({
      where: { tenantId: user.tenantId, active: true, isAnalytic: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.costCenter.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regras de Classificação"
        description="Configure regras automáticas de classificação e validação"
      />
      <ClassificationRulesClient
        classificationRules={JSON.parse(JSON.stringify(classificationRules))}
        validationRules={JSON.parse(JSON.stringify(validationRules))}
        chartOfAccounts={chartOfAccounts}
        costCenters={costCenters}
        suppliers={suppliers}
        customers={customers}
      />
    </div>
  );
}
