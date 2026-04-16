-- =============================================================================
-- Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- DENY-BY-DEFAULT MODEL
-- =============================================================================
--
-- This file defines RLS policies for all business tables in the financial
-- system. Every business table has a "tenantId" column (TEXT) referencing
-- the "Tenant" table.
--
-- SECURITY MODEL: DENY-BY-DEFAULT
--   Rows are INVISIBLE unless a valid, non-empty tenant ID is present in
--   the session variable AND it matches the row's "tenantId".
--
--   If app.current_tenant is NULL, empty, or whitespace-only, ALL rows
--   are denied. There is NO open bypass for missing tenant context.
--
-- HOW IT WORKS:
--   1. The Prisma Client Extension (src/lib/tenant/rls-extension.ts) sets
--      a PostgreSQL session variable before each transaction:
--
--        SET LOCAL app.current_tenant = '<tenantId>';
--
--   2. The helper function current_tenant_id() uses NULLIF+TRIM+COALESCE
--      to return NULL for any empty/whitespace-only value.
--
--   3. Policies require current_tenant_id() IS NOT NULL, so a missing or
--      blank tenant always results in zero rows visible.
--
--   4. Migrations, seeds, and admin scripts must use a role with the
--      BYPASSRLS attribute (e.g., the Prisma migration role) so they
--      are not subject to these policies.
--
-- TABLES WITHOUT RLS (core/auth tables):
--   - "Tenant"
--   - "User"
--   - "Membership"
--   - "Account"
--   - "Session"
--   - "VerificationToken"
--
-- NOTE: Prisma uses PascalCase quoted identifiers. All table and column
-- names in this file use double-quoted identifiers to match.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper function: retrieve the current tenant from the session variable
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(TRIM(COALESCE(current_setting('app.current_tenant', true), '')), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS + create policies for each business table
-- ---------------------------------------------------------------------------

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ChartOfAccount
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "ChartOfAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ChartOfAccount_tenant_isolation" ON "ChartOfAccount"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "ChartOfAccount" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Supplier
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier_tenant_isolation" ON "Supplier"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Supplier" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Customer
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer_tenant_isolation" ON "Customer"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- CostCenter
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "CostCenter" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CostCenter_tenant_isolation" ON "CostCenter"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "CostCenter" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- BankAccount
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BankAccount_tenant_isolation" ON "BankAccount"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "BankAccount" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PaymentMethod
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PaymentMethod_tenant_isolation" ON "PaymentMethod"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "PaymentMethod" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Product
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product_tenant_isolation" ON "Product"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Warehouse
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warehouse_tenant_isolation" ON "Warehouse"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Warehouse" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ClassificationRule
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "ClassificationRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ClassificationRule_tenant_isolation" ON "ClassificationRule"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "ClassificationRule" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PeriodLock
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "PeriodLock" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PeriodLock_tenant_isolation" ON "PeriodLock"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "PeriodLock" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ImportBatch
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "ImportBatch" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ImportBatch_tenant_isolation" ON "ImportBatch"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "ImportBatch" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- TaxInvoiceLine
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "TaxInvoiceLine" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TaxInvoiceLine_tenant_isolation" ON "TaxInvoiceLine"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "TaxInvoiceLine" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- BankStatementLine
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "BankStatementLine" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BankStatementLine_tenant_isolation" ON "BankStatementLine"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "BankStatementLine" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- CardTransaction
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "CardTransaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CardTransaction_tenant_isolation" ON "CardTransaction"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "CardTransaction" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PurchaseInvoice
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "PurchaseInvoice" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PurchaseInvoice_tenant_isolation" ON "PurchaseInvoice"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "PurchaseInvoice" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PurchaseInvoiceItem
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PurchaseInvoiceItem does NOT have a tenantId column directly.
-- Tenant isolation is enforced via the parent PurchaseInvoice which has RLS.
-- All access to PurchaseInvoiceItem goes through PurchaseInvoice (FK cascade).

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- StagingEntry
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "StagingEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "StagingEntry_tenant_isolation" ON "StagingEntry"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "StagingEntry" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- OfficialEntry
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "OfficialEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OfficialEntry_tenant_isolation" ON "OfficialEntry"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "OfficialEntry" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Settlement
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Settlement" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settlement_tenant_isolation" ON "Settlement"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Settlement" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Reconciliation
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "Reconciliation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reconciliation_tenant_isolation" ON "Reconciliation"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "Reconciliation" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- RecurringRule
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "RecurringRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RecurringRule_tenant_isolation" ON "RecurringRule"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "RecurringRule" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- BudgetLine
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "BudgetLine" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BudgetLine_tenant_isolation" ON "BudgetLine"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "BudgetLine" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ClosingChecklist
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "ClosingChecklist" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ClosingChecklist_tenant_isolation" ON "ClosingChecklist"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "ClosingChecklist" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- StockMovement
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "StockMovement_tenant_isolation" ON "StockMovement"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- AuditLog
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AuditLog_tenant_isolation" ON "AuditLog"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- InternalTransfer (RA06)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "InternalTransfer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InternalTransfer_tenant_isolation" ON "InternalTransfer"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "InternalTransfer" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ValidationRule (RA03)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "ValidationRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ValidationRule_tenant_isolation" ON "ValidationRule"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "ValidationRule" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationBatch
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "MigrationBatch" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MigrationBatch_tenant_isolation" ON "MigrationBatch"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "MigrationBatch" FORCE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationItem (uses batchId → MigrationBatch.tenantId for isolation)
-- Note: No tenantId directly, isolation via cascade from MigrationBatch
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationItem does not have tenantId directly.
-- Isolation is enforced via the parent MigrationBatch which has RLS.

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationError (uses batchId → MigrationBatch.tenantId for isolation)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationError does not have tenantId directly.
-- Isolation is enforced via the parent MigrationBatch which has RLS.

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationEntitySummary (uses batchId → MigrationBatch.tenantId)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationEntitySummary does not have tenantId directly.
-- Isolation is enforced via the parent MigrationBatch which has RLS.

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MigrationMapping
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ALTER TABLE "MigrationMapping" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MigrationMapping_tenant_isolation" ON "MigrationMapping"
  USING (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NOT NULL
    AND "tenantId" = current_tenant_id()
  );

ALTER TABLE "MigrationMapping" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
--
-- DENY-BY-DEFAULT SECURITY MODEL
--
-- This file uses a deny-by-default approach:
--   - If app.current_tenant is NULL, empty, or whitespace, ALL rows are hidden.
--   - Only when a valid tenant ID is set can the user see matching rows.
--
-- The helper function current_tenant_id() uses NULLIF(TRIM(COALESCE(...)))
-- to normalise the session variable. Any blank/whitespace value becomes NULL,
-- and the policy condition (current_tenant_id() IS NOT NULL) blocks access.
--
-- ADMIN / MIGRATION ACCESS
--
-- Migrations, seeds, and admin scripts that need cross-tenant access must
-- connect with a PostgreSQL role that has the BYPASSRLS attribute:
--
--   ALTER ROLE prisma_migration BYPASSRLS;
--
-- This role skips RLS entirely, so no tenant context is required.
-- Application roles should NEVER have BYPASSRLS.
--
-- SESSION VARIABLE
--
-- The Prisma Client Extension in src/lib/tenant/rls-extension.ts sets the
-- session variable before each transaction:
--
--   SET LOCAL app.current_tenant = '<tenantId>';
--
-- SET LOCAL ensures the variable is scoped to the current transaction only.
-- After the transaction commits or rolls back, the variable is automatically
-- cleared, preventing tenant context leakage between requests.
--
-- APPLYING POLICIES
--
-- To apply these policies, run this file against your database:
--
--   psql -d your_database -f prisma/rls-policies.sql
--
-- To remove all policies (e.g., for a clean re-apply):
--
--   DO $$
--   DECLARE
--     t TEXT;
--   BEGIN
--     FOR t IN
--       SELECT unnest(ARRAY[
--         'ChartOfAccount','Supplier','Customer','CostCenter','BankAccount',
--         'PaymentMethod','Product','Warehouse','ClassificationRule','PeriodLock',
--         'ImportBatch','TaxInvoiceLine','BankStatementLine','CardTransaction',
--         'PurchaseInvoice','StagingEntry','OfficialEntry',
--         'Settlement','Reconciliation','RecurringRule','BudgetLine',
--         'ClosingChecklist','StockMovement','AuditLog',
--         'InternalTransfer','ValidationRule','MigrationBatch','MigrationMapping'
--       ])
--     LOOP
--       EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
--       EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
--     END LOOP;
--   END $$;
-- =============================================================================
