import type {
  StagingStatus,
  EntryStatus,
  ImportStatus,
  CardTransactionStatus,
  ChecklistStatus,
  Severity,
} from "@/generated/prisma";

export const STAGING_STATUS_LABELS: Record<StagingStatus, string> = {
  PENDING: "Pendente",
  AUTO_CLASSIFIED: "Auto-classificado",
  VALIDATED: "Validado",
  INCORPORATED: "Incorporado",
  REJECTED: "Rejeitado",
};

export const STAGING_STATUS_COLORS: Record<StagingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AUTO_CLASSIFIED: "bg-blue-100 text-blue-800",
  VALIDATED: "bg-green-100 text-green-800",
  INCORPORATED: "bg-purple-100 text-purple-800",
  REJECTED: "bg-red-100 text-red-800",
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  OPEN: "Em aberto",
  PARTIAL: "Parcial",
  SETTLED: "Liquidado",
  CANCELLED: "Cancelado",
};

export const ENTRY_STATUS_COLORS: Record<EntryStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
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
