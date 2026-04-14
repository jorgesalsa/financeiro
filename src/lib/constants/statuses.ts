import type {
  StagingStatus,
  StagingSource,
  EntryStatus,
  ImportStatus,
  CardTransactionStatus,
  ChecklistStatus,
  Severity,
  TransactionType,
  EntryCategory,
  MovementType,
  FinancialNature,
  ClassificationStatus,
  MatchBasis,
  RuleActionType,
  MigrationBatchStatus,
  MigrationBatchType,
  MigrationEntityType,
  MigrationItemStatus,
  MigrationSeverity,
} from "@/generated/prisma";

export const STAGING_SOURCE_LABELS: Record<StagingSource, string> = {
  MANUAL: "Manual",
  IMPORT_TAX_INVOICE: "Nota Fiscal",
  IMPORT_BANK_STATEMENT: "Extrato Bancário",
  IMPORT_CARD: "Cartão",
  IMPORT_PURCHASE_INVOICE: "Nota de Compra",
  IMPORT_PLUGGY: "Pluggy",
  IMPORT_QIVE: "QIVE",
  MIGRATION: "Migração",
};

export const STAGING_STATUS_LABELS: Record<StagingStatus, string> = {
  PENDING: "Pendente",
  PARSED: "Parseado",
  NORMALIZED: "Normalizado",
  AUTO_CLASSIFIED: "Auto-classificado",
  CONFLICT: "Conflito",
  VALIDATED: "Validado",
  INCORPORATED: "Incorporado",
  REJECTED: "Rejeitado",
};

export const STAGING_STATUS_COLORS: Record<StagingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARSED: "bg-sky-100 text-sky-800",
  NORMALIZED: "bg-indigo-100 text-indigo-800",
  AUTO_CLASSIFIED: "bg-blue-100 text-blue-800",
  CONFLICT: "bg-orange-100 text-orange-800",
  VALIDATED: "bg-green-100 text-green-800",
  INCORPORATED: "bg-purple-100 text-purple-800",
  REJECTED: "bg-red-100 text-red-800",
};

// ─── Transaction Type & Category Labels ─────────────────────────────────────

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEBIT: "Conta a Pagar",
  CREDIT: "Conta a Receber",
};

export const TRANSACTION_TYPE_SHORT: Record<TransactionType, string> = {
  DEBIT: "A Pagar",
  CREDIT: "A Receber",
};

export const ENTRY_CATEGORY_LABELS: Record<EntryCategory, string> = {
  PAYABLE: "Conta a Pagar",
  RECEIVABLE: "Conta a Receber",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

export const ENTRY_CATEGORY_SHORT: Record<EntryCategory, string> = {
  PAYABLE: "A Pagar",
  RECEIVABLE: "A Receber",
  TRANSFER: "Transf.",
  ADJUSTMENT: "Ajuste",
};

// ─── RA05: 4-Layer Taxonomy ─────────────────────────────────────────────────

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  TRANSFER: "Transferência",
  ADJUSTMENT: "Ajuste",
};

export const FINANCIAL_NATURE_LABELS: Record<FinancialNature, string> = {
  OPERATIONAL: "Operacional",
  NON_OPERATIONAL: "Não Operacional",
  FINANCIAL: "Financeiro",
  PATRIMONIAL: "Patrimonial",
};

export const CLASSIFICATION_STATUS_LABELS: Record<ClassificationStatus, string> = {
  CLASSIFIED: "Classificado",
  PENDING_CLASSIFICATION: "Pendente de Classificação",
  DOUBT: "Dúvida",
  CONFLICT: "Conflito",
};

export const CLASSIFICATION_STATUS_COLORS: Record<ClassificationStatus, string> = {
  CLASSIFIED: "bg-green-100 text-green-800",
  PENDING_CLASSIFICATION: "bg-yellow-100 text-yellow-800",
  DOUBT: "bg-amber-100 text-amber-800",
  CONFLICT: "bg-red-100 text-red-800",
};

// ─── RA04: Match Basis ──────────────────────────────────────────────────────

export const MATCH_BASIS_LABELS: Record<MatchBasis, string> = {
  AMOUNT_DATE: "Valor + Data",
  AMOUNT_DESCRIPTION: "Valor + Descrição",
  AMOUNT_CNPJ: "Valor + CNPJ",
  AMOUNT_ONLY: "Apenas Valor",
  DESCRIPTION_ONLY: "Apenas Descrição",
  MANUAL: "Manual",
};

// ─── RA03: Rule Action Types ────────────────────────────────────────────────

export const RULE_ACTION_TYPE_LABELS: Record<RuleActionType, string> = {
  CLASSIFY: "Classificar",
  BLOCK: "Bloquear",
  ALERT: "Alertar",
  QUEUE: "Enfileirar",
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  OPEN: "Em aberto",
  PARTIAL: "Parcial",
  OVERDUE: "Vencido",
  SETTLED: "Liquidado",
  CANCELLED: "Cancelado",
};

export const ENTRY_STATUS_COLORS: Record<EntryStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  OVERDUE: "bg-red-100 text-red-800",
  SETTLED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
};

export const CARD_STATUS_LABELS: Record<CardTransactionStatus, string> = {
  PENDING: "Pendente",
  SETTLED: "Liquidado",
  CANCELLED: "Cancelado",
};

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  NOT_APPLICABLE: "N/A",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

// ─── Migration Module ──────────────────────────────────────────────────────

export const MIGRATION_BATCH_STATUS_LABELS: Record<MigrationBatchStatus, string> = {
  DRAFT: "Rascunho",
  UPLOADED: "Arquivo Enviado",
  MAPPED: "Mapeado",
  VALIDATING: "Validando",
  VALIDATED: "Validado",
  REVIEWING: "Em Revisao",
  PENDING_APPROVAL: "Aguardando Aprovacao",
  APPROVED: "Aprovado",
  PROCESSING: "Processando",
  COMPLETED: "Concluido",
  COMPLETED_PARTIAL: "Parcial",
  FAILED: "Falhou",
  ROLLED_BACK: "Desfeito",
  CANCELLED: "Cancelado",
};

export const MIGRATION_BATCH_STATUS_COLORS: Record<MigrationBatchStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  UPLOADED: "bg-sky-100 text-sky-800",
  MAPPED: "bg-indigo-100 text-indigo-800",
  VALIDATING: "bg-blue-100 text-blue-800",
  VALIDATED: "bg-teal-100 text-teal-800",
  REVIEWING: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-orange-100 text-orange-800",
  APPROVED: "bg-lime-100 text-lime-800",
  PROCESSING: "bg-violet-100 text-violet-800",
  COMPLETED: "bg-green-100 text-green-800",
  COMPLETED_PARTIAL: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
  ROLLED_BACK: "bg-pink-100 text-pink-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const MIGRATION_BATCH_TYPE_LABELS: Record<MigrationBatchType, string> = {
  FULL_INITIAL_LOAD: "Carga Inicial",
  MODULE_IMPORT: "Importacao por Modulo",
  MASS_UPDATE: "Atualizacao em Massa",
  REIMPORT: "Reimportacao",
  EXPORT: "Exportacao",
};

export const MIGRATION_ENTITY_TYPE_LABELS: Record<MigrationEntityType, string> = {
  CHART_OF_ACCOUNTS: "Categorias",
  COST_CENTERS: "Centros de Custo",
  SUPPLIERS: "Fornecedores",
  CUSTOMERS: "Clientes",
  BANK_ACCOUNTS: "Contas Bancarias",
  PAYMENT_METHODS: "Formas de Pagamento",
  CLASSIFICATION_RULES: "Regras de Classificacao",
  VALIDATION_RULES: "Regras de Validacao",
  STAGING_ENTRIES: "Lancamentos Staging",
  OFFICIAL_ENTRIES: "Lancamentos Oficiais",
  SETTLEMENTS: "Baixas/Liquidacoes",
  RECONCILIATIONS: "Conciliacoes",
  INSTALLMENTS: "Parcelas",
  RECURRING_RULES: "Recorrencias",
  INTERNAL_TRANSFERS: "Transferencias Internas",
  OPENING_BALANCES: "Saldos Iniciais",
  PRODUCTS: "Produtos",
  WAREHOUSES: "Depositos",
};

export const MIGRATION_ITEM_STATUS_LABELS: Record<MigrationItemStatus, string> = {
  PENDING: "Pendente",
  VALID: "Valido",
  WARNING: "Com Avisos",
  ERROR: "Com Erros",
  SKIPPED: "Descartado",
  DUPLICATE: "Duplicata",
  IMPORTED: "Importado",
  FAILED: "Falhou",
  ROLLED_BACK: "Desfeito",
};

export const MIGRATION_ITEM_STATUS_COLORS: Record<MigrationItemStatus, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  VALID: "bg-green-100 text-green-800",
  WARNING: "bg-amber-100 text-amber-800",
  ERROR: "bg-red-100 text-red-800",
  SKIPPED: "bg-gray-100 text-gray-600",
  DUPLICATE: "bg-orange-100 text-orange-800",
  IMPORTED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  ROLLED_BACK: "bg-pink-100 text-pink-800",
};

export const MIGRATION_SEVERITY_LABELS: Record<MigrationSeverity, string> = {
  ERROR: "Erro",
  WARNING: "Aviso",
  INFO: "Informacao",
};

export const MIGRATION_SEVERITY_COLORS: Record<MigrationSeverity, string> = {
  ERROR: "bg-red-100 text-red-800",
  WARNING: "bg-amber-100 text-amber-800",
  INFO: "bg-blue-100 text-blue-800",
};

// Import order: topological levels for migration
export const MIGRATION_IMPORT_ORDER: MigrationEntityType[] = [
  // Level 0: Base (no dependencies)
  "CHART_OF_ACCOUNTS",
  "COST_CENTERS",
  "PAYMENT_METHODS",
  "PRODUCTS",
  "WAREHOUSES",
  // Level 1: Depends on level 0
  "SUPPLIERS",
  "CUSTOMERS",
  "BANK_ACCOUNTS",
  // Level 2: Depends on level 0+1
  "CLASSIFICATION_RULES",
  "VALIDATION_RULES",
  "OPENING_BALANCES",
  // Level 3: Entries
  "STAGING_ENTRIES",
  "OFFICIAL_ENTRIES",
  // Level 4: Operations on entries
  "SETTLEMENTS",
  "INSTALLMENTS",
  "INTERNAL_TRANSFERS",
  // Level 5: Reconciliation
  "RECONCILIATIONS",
  // Level 6: Recurring
  "RECURRING_RULES",
];
