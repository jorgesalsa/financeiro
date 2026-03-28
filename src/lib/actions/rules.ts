"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { classificationRuleSchema, validationRuleSchema } from "@/lib/validations/rules";
import type { ClassificationRuleInput, ValidationRuleInput } from "@/lib/validations/rules";

// ─── Classification Rules ───────────────────────────────────────────────────

export async function listClassificationRules() {
  const user = await getCurrentUser();
  return prisma.classificationRule.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { priority: "asc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      costCenter: { select: { code: true, name: true } },
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
}

export async function createClassificationRule(data: ClassificationRuleInput) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  const validated = classificationRuleSchema.parse(data);

  const rule = await prisma.classificationRule.create({
    data: {
      ...validated,
      tenantId: user.tenantId,
    },
  });

  revalidatePath("/settings/classification-rules");
  return rule;
}

export async function updateClassificationRule(id: string, data: ClassificationRuleInput) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  const validated = classificationRuleSchema.parse(data);

  const rule = await prisma.classificationRule.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/settings/classification-rules");
  return rule;
}

export async function deleteClassificationRule(id: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  await prisma.classificationRule.delete({
    where: { id },
  });

  revalidatePath("/settings/classification-rules");
}

// ─── Validation Rules ───────────────────────────────────────────────────────

export async function listValidationRules() {
  const user = await getCurrentUser();
  return prisma.validationRule.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createValidationRule(data: ValidationRuleInput) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  const validated = validationRuleSchema.parse(data);

  const rule = await prisma.validationRule.create({
    data: {
      ...validated,
      config: validated.config as any,
      tenantId: user.tenantId,
    },
  });

  revalidatePath("/settings/classification-rules");
  return rule;
}

export async function updateValidationRule(id: string, data: ValidationRuleInput) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  const validated = validationRuleSchema.parse(data);

  const rule = await prisma.validationRule.update({
    where: { id },
    data: {
      ...validated,
      config: validated.config as any,
    },
  });

  revalidatePath("/settings/classification-rules");
  return rule;
}

export async function deleteValidationRule(id: string) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  await prisma.validationRule.delete({
    where: { id },
  });

  revalidatePath("/settings/classification-rules");
}
