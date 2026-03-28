import prisma from "@/lib/db";

// RA07: Fields that cannot be modified after incorporation
const IMMUTABLE_FIELDS = [
  "date",
  "competenceDate",
  "amount",
  "type",
  "category",
  "chartOfAccountId",
  "incorporatedById",
  "incorporatedAt",
  "stagingEntryId",
  "sequentialNumber",
] as const;

type ImmutableField = (typeof IMMUTABLE_FIELDS)[number];

/**
 * RA07: Assert that immutable fields have not been changed.
 * Compares the current DB record with proposed updates.
 */
export function assertFieldsNotMutated(
  currentRecord: Record<string, unknown>,
  updates: Record<string, unknown>
): void {
  const violations: string[] = [];

  for (const field of IMMUTABLE_FIELDS) {
    if (field in updates) {
      const currentValue = currentRecord[field];
      const newValue = updates[field];

      // Normalize for comparison
      const currentStr = normalizeValue(currentValue);
      const newStr = normalizeValue(newValue);

      if (currentStr !== newStr) {
        violations.push(field);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Campos imutáveis não podem ser alterados após incorporação: ${violations.join(", ")}`
    );
  }
}

/**
 * RA07: Optimistic locking — assert that the version hasn't changed.
 */
export async function assertVersionMatch(
  entryId: string,
  tenantId: string,
  expectedVersion: number
): Promise<void> {
  const entry = await prisma.officialEntry.findFirstOrThrow({
    where: { id: entryId, tenantId },
    select: { version: true },
  });

  if (entry.version !== expectedVersion) {
    throw new Error(
      `Conflito de versão: esperada v${expectedVersion}, encontrada v${entry.version}. ` +
      `O registro foi modificado por outro usuário. Recarregue e tente novamente.`
    );
  }
}

/**
 * RA07: Increment version after a successful update.
 */
export async function incrementVersion(entryId: string): Promise<number> {
  const updated = await prisma.officialEntry.update({
    where: { id: entryId },
    data: { version: { increment: 1 } },
    select: { version: true },
  });
  return updated.version;
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
