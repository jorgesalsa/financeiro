import { db } from "@/lib/db";

/**
 * Execute a callback within a tenant-scoped transaction.
 *
 * Sets the PostgreSQL session variable `app.current_tenant` so that
 * Row-Level Security (RLS) policies restrict all queries to the
 * specified tenant. Uses `SET LOCAL` which automatically scopes the
 * variable to the current transaction -- it is cleared when the
 * transaction commits or rolls back, preventing tenant context leakage.
 *
 * @example
 * ```ts
 * const accounts = await withTenantScope(tenantId, async (tx) => {
 *   return tx.chartOfAccount.findMany();
 * });
 * ```
 *
 * @param tenantId - The tenant ID to scope all queries to.
 * @param callback - An async function receiving the transactional Prisma
 *                   client. All Prisma operations inside this callback
 *                   will be subject to RLS filtering.
 * @returns The value returned by the callback.
 */
export async function withTenantScope<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    // SET LOCAL scopes the variable to this transaction only.
    // Using a parameterised query ($1) to prevent SQL injection.
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant = $1`,
      tenantId,
    );
    // Cast the transactional client so callers can use the full
    // Prisma API without type errors.
    return callback(tx as unknown as typeof db);
  });
}
