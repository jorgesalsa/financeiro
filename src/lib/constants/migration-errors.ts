/**
 * Migration Error Impact Metadata
 *
 * Maps (code, entityType, field) → impact information used to:
 * 1. Explain each error to the user in the Errors tab
 * 2. Determine if an error is blocking or non-blocking
 * 3. Suggest bulk actions (ignore, fill, discard)
 */

export type ErrorImpactLevel = "BLOCKING" | "NON_BLOCKING";
export type SuggestedAction = "IGNORE" | "FILL_BATCH" | "DISCARD_ITEMS";

export interface ErrorImpactInfo {
  title: string;
  explanation: string;
  impact: string;
  level: ErrorImpactLevel;
  suggestedActions: SuggestedAction[];
  /** Options for FILL_BATCH action, if applicable */
  fillOptions?: { label: string; value: string }[];
}

type ErrorKey = string; // format: "CODE:ENTITY:FIELD" or "CODE:*:FIELD" or "CODE:ENTITY:*"

const ERROR_IMPACT_MAP: Record<ErrorKey, ErrorImpactInfo> = {
  // ── STAGING_ENTRIES: campos agora recomendados (nao-bloqueantes) ──────

  "E001:STAGING_ENTRIES:bank_code": {
    title: "Codigo do Banco",
    explanation: "Identifica o banco (ex: 001 = BB, 237 = Bradesco) para vincular o lancamento a uma conta bancaria.",
    impact: "Importado sem vinculo a conta bancaria. Pode ser atribuido manualmente depois.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "E001:STAGING_ENTRIES:agency": {
    title: "Agencia Bancaria",
    explanation: "Numero da agencia para localizar a conta bancaria vinculada ao lancamento.",
    impact: "Importado sem vinculo a conta bancaria. Pode ser atribuido manualmente depois.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "E001:STAGING_ENTRIES:account_number": {
    title: "Numero da Conta",
    explanation: "Numero da conta bancaria para vincular o lancamento.",
    impact: "Importado sem vinculo a conta bancaria. Pode ser atribuido manualmente depois.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "E001:STAGING_ENTRIES:payment_method": {
    title: "Forma de Pagamento",
    explanation: "Define como o pagamento foi realizado (PIX, Boleto, Transferencia, etc.).",
    impact: "Importado sem forma de pagamento. Pode ser preenchido depois nos lancamentos.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
    fillOptions: [
      { label: "PIX", value: "PIX" },
      { label: "Boleto", value: "Boleto" },
      { label: "Transferencia", value: "Transferencia" },
      { label: "Cartao de Credito", value: "Cartao de Credito" },
      { label: "Cartao de Debito", value: "Cartao de Debito" },
      { label: "Dinheiro", value: "Dinheiro" },
      { label: "Cheque", value: "Cheque" },
      { label: "Outros", value: "Outros" },
    ],
  },

  "E001:STAGING_ENTRIES:document_number": {
    title: "Numero do Documento",
    explanation: "Numero da nota fiscal, boleto ou outro documento associado ao lancamento.",
    impact: "Importado sem referencia de documento. Pode ser adicionado depois.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE"],
  },

  // ── STAGING_ENTRIES: campos obrigatorios (bloqueantes) ────────────────

  "E001:STAGING_ENTRIES:date": {
    title: "Data do Lancamento",
    explanation: "Data em que o lancamento foi realizado. Obrigatoria para classificacao temporal.",
    impact: "Sem data, o lancamento nao pode ser registrado no sistema.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:STAGING_ENTRIES:competence_date": {
    title: "Data de Competencia",
    explanation: "Data para apuracao contabil (regime de competencia).",
    impact: "Sem data de competencia, o lancamento nao pode ser classificado contabilmente.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:STAGING_ENTRIES:due_date": {
    title: "Data de Vencimento",
    explanation: "Data de vencimento para controle de contas a pagar/receber.",
    impact: "Sem vencimento, o sistema nao consegue gerar alertas de cobranca.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:STAGING_ENTRIES:description": {
    title: "Descricao",
    explanation: "Texto descritivo do lancamento para identificacao.",
    impact: "Sem descricao, o lancamento fica sem contexto no sistema.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:STAGING_ENTRIES:amount": {
    title: "Valor",
    explanation: "Valor monetario do lancamento.",
    impact: "Sem valor, o lancamento nao pode ser registrado.",
    level: "BLOCKING",
    suggestedActions: ["DISCARD_ITEMS"],
  },

  "E001:STAGING_ENTRIES:financial_nature": {
    title: "Natureza Financeira",
    explanation: "Classifica o lancamento como Operacional, Nao-operacional, Financeiro ou Patrimonial.",
    impact: "Sem natureza financeira, o lancamento nao pode ser classificado nos relatorios.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
    fillOptions: [
      { label: "Operacional", value: "OPERATIONAL" },
      { label: "Nao-operacional", value: "NON_OPERATIONAL" },
      { label: "Financeiro", value: "FINANCIAL" },
      { label: "Patrimonial", value: "PATRIMONIAL" },
    ],
  },

  "E001:STAGING_ENTRIES:chart_of_account_code": {
    title: "Codigo do Plano de Contas",
    explanation: "Vincula o lancamento a uma categoria contabil do plano de contas.",
    impact: "Sem categoria, o lancamento nao aparece nos relatorios por categoria.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  // ── Outras entidades: E001 ────────────────────────────────────────────

  "E001:CHART_OF_ACCOUNTS:name": {
    title: "Nome da Conta",
    explanation: "Nome da categoria no plano de contas.",
    impact: "Sem nome, a conta nao pode ser criada.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:CHART_OF_ACCOUNTS:type": {
    title: "Tipo da Conta",
    explanation: "Tipo: Receita, Deducao, Custo, Despesa ou Investimento.",
    impact: "Sem tipo, o sistema nao sabe como classificar a conta.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
    fillOptions: [
      { label: "Receita", value: "REVENUE" },
      { label: "Deducao", value: "DEDUCTION" },
      { label: "Custo", value: "COST" },
      { label: "Despesa", value: "EXPENSE" },
      { label: "Investimento", value: "INVESTMENT" },
    ],
  },

  "E001:SUPPLIERS:name": {
    title: "Nome do Fornecedor",
    explanation: "Nome ou razao social do fornecedor.",
    impact: "Sem nome, o fornecedor nao pode ser criado.",
    level: "BLOCKING",
    suggestedActions: ["DISCARD_ITEMS"],
  },

  "E001:CUSTOMERS:name": {
    title: "Nome do Cliente",
    explanation: "Nome ou razao social do cliente.",
    impact: "Sem nome, o cliente nao pode ser criado.",
    level: "BLOCKING",
    suggestedActions: ["DISCARD_ITEMS"],
  },

  "E001:CUSTOMERS:cnpj_cpf": {
    title: "CNPJ/CPF do Cliente",
    explanation: "Documento de identificacao do cliente.",
    impact: "Sem CNPJ/CPF, o sistema nao consegue identificar duplicatas.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E001:BANK_ACCOUNTS:bank_name": {
    title: "Nome do Banco",
    explanation: "Nome da instituicao financeira.",
    impact: "Sem nome, a conta bancaria nao pode ser criada.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  // ── E003: Valores negativos ───────────────────────────────────────────

  "E003:*:amount": {
    title: "Valor Negativo",
    explanation: "O valor informado e negativo, mas o sistema espera valores positivos.",
    impact: "Lancamentos com valor negativo nao sao aceitos.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  // ── E005: CNPJ/CPF invalido ───────────────────────────────────────────

  "E005:SUPPLIERS:cnpj_cpf": {
    title: "CNPJ/CPF Invalido (Fornecedor)",
    explanation: "O documento informado nao tem 11 (CPF) nem 14 (CNPJ) digitos.",
    impact: "Fornecedor importado mas com documento invalido, pode causar problemas fiscais.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  "E005:CUSTOMERS:cnpj_cpf": {
    title: "CNPJ/CPF Invalido (Cliente)",
    explanation: "O documento informado nao tem 11 (CPF) nem 14 (CNPJ) digitos.",
    impact: "Cliente importado mas com documento invalido, pode causar problemas fiscais.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
  },

  // ── E021: Enum invalido ───────────────────────────────────────────────

  "E021:CHART_OF_ACCOUNTS:type": {
    title: "Tipo de Conta Invalido",
    explanation: "O tipo informado nao e um valor reconhecido pelo sistema.",
    impact: "A conta nao pode ser criada com um tipo desconhecido.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
    fillOptions: [
      { label: "Receita", value: "REVENUE" },
      { label: "Deducao", value: "DEDUCTION" },
      { label: "Custo", value: "COST" },
      { label: "Despesa", value: "EXPENSE" },
      { label: "Investimento", value: "INVESTMENT" },
    ],
  },

  "E021:STAGING_ENTRIES:financial_nature": {
    title: "Natureza Financeira Invalida",
    explanation: "O valor informado nao corresponde a nenhuma natureza financeira valida.",
    impact: "O lancamento nao pode ser classificado com esta natureza.",
    level: "BLOCKING",
    suggestedActions: ["FILL_BATCH", "DISCARD_ITEMS"],
    fillOptions: [
      { label: "Operacional", value: "OPERATIONAL" },
      { label: "Nao-operacional", value: "NON_OPERATIONAL" },
      { label: "Financeiro", value: "FINANCIAL" },
      { label: "Patrimonial", value: "PATRIMONIAL" },
    ],
  },

  // ── W002: Valor muito alto ────────────────────────────────────────────

  "W002:*:amount": {
    title: "Valor Muito Alto",
    explanation: "O valor do lancamento e superior a R$ 1.000.000.",
    impact: "Pode ser importado normalmente, mas recomenda-se verificar se o valor esta correto.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE"],
  },

  // ── W009: Sem categoria ───────────────────────────────────────────────

  "W009:STAGING_ENTRIES:chart_of_account_code": {
    title: "Sem Categoria Contabil",
    explanation: "Lancamento sem codigo de plano de contas vinculado.",
    impact: "Pode ser importado, mas nao aparecera nos relatorios por categoria ate ser classificado.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  // ── W010: Campo recomendado ausente (novo) ────────────────────────────

  "W010:STAGING_ENTRIES:bank_code": {
    title: "Codigo do Banco Ausente",
    explanation: "Codigo do banco nao informado. Campo recomendado para vinculo bancario.",
    impact: "Importado sem vinculo a conta bancaria.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "W010:STAGING_ENTRIES:agency": {
    title: "Agencia Ausente",
    explanation: "Numero da agencia nao informado. Campo recomendado para vinculo bancario.",
    impact: "Importado sem vinculo a conta bancaria.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "W010:STAGING_ENTRIES:account_number": {
    title: "Numero da Conta Ausente",
    explanation: "Numero da conta nao informado. Campo recomendado para vinculo bancario.",
    impact: "Importado sem vinculo a conta bancaria.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
  },

  "W010:STAGING_ENTRIES:payment_method": {
    title: "Forma de Pagamento Ausente",
    explanation: "Forma de pagamento nao informada. Campo recomendado.",
    impact: "Importado sem forma de pagamento definida.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE", "FILL_BATCH"],
    fillOptions: [
      { label: "PIX", value: "PIX" },
      { label: "Boleto", value: "Boleto" },
      { label: "Transferencia", value: "Transferencia" },
      { label: "Cartao de Credito", value: "Cartao de Credito" },
      { label: "Cartao de Debito", value: "Cartao de Debito" },
      { label: "Dinheiro", value: "Dinheiro" },
      { label: "Cheque", value: "Cheque" },
      { label: "Outros", value: "Outros" },
    ],
  },

  "W010:STAGING_ENTRIES:document_number": {
    title: "Numero do Documento Ausente",
    explanation: "Numero do documento (NF, boleto) nao informado. Campo recomendado.",
    impact: "Importado sem referencia de documento.",
    level: "NON_BLOCKING",
    suggestedActions: ["IGNORE"],
  },
};

/**
 * Look up error impact info by code, entity type and field.
 * Falls back to wildcard matches (code:*:field) if exact not found.
 */
export function getErrorImpact(
  code: string,
  entityType: string | null,
  field: string | null
): ErrorImpactInfo | null {
  if (!field) return null;

  // Try exact match first
  const exactKey = `${code}:${entityType}:${field}`;
  if (ERROR_IMPACT_MAP[exactKey]) return ERROR_IMPACT_MAP[exactKey];

  // Try wildcard entity
  const wildcardKey = `${code}:*:${field}`;
  if (ERROR_IMPACT_MAP[wildcardKey]) return ERROR_IMPACT_MAP[wildcardKey];

  return null;
}

/**
 * Check if a specific error is blocking based on the impact map.
 * Returns true (blocking) if no mapping found (safe default).
 */
export function isBlockingError(
  code: string,
  entityType: string | null,
  field: string | null
): boolean {
  const impact = getErrorImpact(code, entityType, field);
  if (!impact) return true; // unknown errors are blocking by default
  return impact.level === "BLOCKING";
}
