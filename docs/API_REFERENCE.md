# API Reference — Sistema Financeiro SaaS

> Documentacao de todas as Server Actions e schemas de validacao do sistema.
> Todas as actions exigem autenticacao via NextAuth e operam com isolamento multi-tenant.

---

## Indice

- [Financial](#financial)
- [Staging](#staging)
- [Reconciliation](#reconciliation)
- [Import](#import)
- [Transfer](#transfer)
- [Master Data](#master-data)
- [Schemas de Validacao](#schemas-de-validacao)
- [Rate Limiting](#rate-limiting)
- [Paginacao](#paginacao)

---

## Financial

**Arquivo**: `src/lib/actions/financial.ts`

### `listOfficialEntries(filters?)`

Lista lancamentos oficiais com paginacao server-side.

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `filters.category` | `string` | Nao | `PAYABLE`, `RECEIVABLE`, `TRANSFER`, `ADJUSTMENT` |
| `filters.status` | `string` | Nao | `OPEN`, `PARTIAL`, `SETTLED`, `CANCELLED` |
| `filters.startDate` | `string` | Nao | ISO date string (filtro `>=`) |
| `filters.endDate` | `string` | Nao | ISO date string (filtro `<=`) |
| `filters.pagination` | `PaginationParams` | Nao | `{ page?, pageSize? }` |

**Retorno**: `PaginatedResult<OfficialEntry>` com includes: chartOfAccount, costCenter, supplier, customer, bankAccount, settlements.

---

### `settleOfficialEntry(rawData)`

Realiza baixa (pagamento/recebimento) de um lancamento.

| Parametro | Tipo | Validacao |
|-----------|------|-----------|
| `rawData` | `unknown` | Validado por `settlementSchema` |

**Campos validados**: officialEntryId, date, settlementDate?, amount, interestAmount, fineAmount, discountAmount, bankAccountId, paymentMethodId?, document?, notes?

**Retorno**: Resultado da baixa (settlement record).

**Revalidacao**: `/financial/entries`, `/financial/payables`, `/financial/receivables`

---

### `createInstallments(rawData)`

Gera parcelas para um lancamento.

| Parametro | Tipo | Validacao |
|-----------|------|-----------|
| `rawData` | `unknown` | Validado por `installmentSchema` |

**Campos validados**: officialEntryId, numberOfInstallments, firstDueDate, intervalDays

**Retorno**: Resultado da geracao de parcelas.

---

### `cancelEntry(id)`

Cancela um lancamento e reverte impactos bancarios (saldos).

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | `string` | ID do lancamento oficial |

**Efeitos**: Reverte saldos bancarios de todas as baixas, deleta settlements, atualiza status para `CANCELLED`. Gera audit log.

---

## Staging

**Arquivo**: `src/lib/actions/staging.ts`

### `listStagingEntries(params?)`

Lista lancamentos no staging com filtro por status e paginacao.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `params.status` | `string` | Filtro de status (ex: `PENDING`, `VALIDATED`, `REJECTED`) |
| `params.pagination` | `PaginationParams` | `{ page?, pageSize? }` |

**Retorno**: `PaginatedResult<StagingEntry>` com includes: chartOfAccount, costCenter, supplier, customer, bankAccount.

---

### `getStagingStatusCounts()`

Retorna contagem de lancamentos por status (para tabs de filtro).

**Retorno**: `Record<string, number>` — Ex: `{ PENDING: 5, VALIDATED: 3, ALL: 8 }`

---

### `createStagingEntry(data)`

Cria novo lancamento no staging.

| Parametro | Tipo | Validacao |
|-----------|------|-----------|
| `data` | `StagingEntryInput` | Validado por `stagingEntrySchema` |

---

### `updateStagingEntry(id, data)`

Atualiza lancamento existente no staging.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | `string` | ID do lancamento |
| `data` | `StagingEntryInput` | Dados atualizados |

---

### `validateEntries(ids)`

Valida campos obrigatorios de uma lista de lancamentos.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ids` | `string[]` | IDs dos lancamentos a validar |

**Retorno**: Array de resultados de validacao.

---

### `rejectStagingEntry(id, reason)`

Rejeita um lancamento com motivo.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | `string` | ID do lancamento |
| `reason` | `string` | Motivo da rejeicao |

---

### `incorporateEntries(ids)` ⚡ Rate Limited

Incorpora lancamentos validados ao livro oficial.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ids` | `string[]` | IDs dos lancamentos a incorporar |

**Permissao**: Requer role `ADMIN` ou `CONTROLLER`.
**Rate Limit**: 5 chamadas/minuto por tenant.

---

## Reconciliation

**Arquivo**: `src/lib/actions/reconciliation.ts`

### `runAutoReconciliation(bankAccountId)` ⚡ Rate Limited

Executa conciliacao automatica (3 passes com scoring de confianca).

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `bankAccountId` | `string` | ID da conta bancaria |

**Rate Limit**: 20 chamadas/minuto por tenant.

---

### `reconcileManually(bankStatementLineId, officialEntryId, settlementId)`

Concilia manualmente uma linha de extrato com lancamento ou baixa.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `bankStatementLineId` | `string` | ID da linha do extrato |
| `officialEntryId` | `string \| null` | ID do lancamento oficial |
| `settlementId` | `string \| null` | ID da baixa |

---

### `undoReconciliation(reconciliationId)`

Desfaz uma conciliacao existente.

---

### `approveReconciliationAction(reconciliationId)`

Aprova conciliacao que requer revisao humana (confianca < 70%).

---

### `listReviewQueue(params?)`

Lista conciliacoes aguardando revisao humana.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `params.bankAccountId` | `string` | Filtro por conta |
| `params.pagination` | `PaginationParams` | Paginacao |

---

### `getReconciliationStatus(bankAccountId)`

Retorna estatisticas de conciliacao para uma conta.

**Retorno**: `{ total, reconciled, pending, percentage }`

---

## Import

**Arquivo**: `src/lib/actions/import.ts`

> Todas as funcoes de importacao possuem **rate limit de 10 chamadas/minuto por tenant**.

### `importBankStatement(formData)` ⚡ Rate Limited

Importa extrato bancario (OFX, CSV, TXT).

| Campo FormData | Tipo | Descricao |
|----------------|------|-----------|
| `file` | `File` | Arquivo OFX/CSV/TXT |
| `bankAccountId` | `string` | ID da conta bancaria destino |

**Retorno**: `{ batchId, total, classified }`

---

### `importCardTransactions(formData)` ⚡ Rate Limited

Importa transacoes de cartao (CSV, XLSX).

| Campo FormData | Tipo |
|----------------|------|
| `file` | `File` |

---

### `importTaxInvoices(formData)` ⚡ Rate Limited

Importa notas fiscais (CSV, XLSX).

---

### `importTaxInvoicesXML(formData)` ⚡ Rate Limited

Importa NFe via XML.

| Campo FormData | Tipo |
|----------------|------|
| `files` | `File[]` |

**Retorno**: `{ batchId, total, classified, errors?, errorMessages? }`

---

### `importPurchaseInvoices(formData)` ⚡ Rate Limited

Importa notas de compra (CSV, XLSX).

---

### `listImportBatches(params?)`

Lista lotes de importacao com paginacao.

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `params.type` | `string` | `BANK_STATEMENT`, `CARD_TRANSACTION`, `TAX_INVOICE`, `PURCHASE_INVOICE` |
| `params.pagination` | `PaginationParams` | Paginacao |

---

## Transfer

**Arquivo**: `src/lib/actions/transfer.ts`

### `listInternalTransfers(params?)`

Lista transferencias internas com paginacao.

| Parametro | Tipo |
|-----------|------|
| `params.pagination` | `PaginationParams` |

---

### `createTransfer(data)`

Cria transferencia entre contas bancarias.

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| `sourceAccountId` | `string` | Sim |
| `targetAccountId` | `string` | Sim |
| `amount` | `number` | Sim |
| `transferDate` | `string` | Sim |
| `reference` | `string` | Nao |

**Permissao**: Requer role `ADMIN` ou `CONTROLLER`.
**Validacao**: `internalTransferSchema` (contas devem ser diferentes).

---

## Master Data

**Arquivo**: `src/lib/actions/master-data.ts`

Todas as entidades de dados mestres seguem o padrao CRUD:

| Entidade | List | Create | Update | Delete |
|----------|------|--------|--------|--------|
| Chart of Accounts | `listChartOfAccounts()` | `createChartOfAccount(data)` | `updateChartOfAccount(id, data)` | `deleteChartOfAccount(id)` |
| Suppliers | `listSuppliers()` | `createSupplier(data)` | `updateSupplier(id, data)` | `deleteSupplier(id)` |
| Customers | `listCustomers()` | `createCustomer(data)` | `updateCustomer(id, data)` | `deleteCustomer(id)` |
| Cost Centers | `listCostCenters()` | `createCostCenter(data)` | `updateCostCenter(id, data)` | `deleteCostCenter(id)` |
| Bank Accounts | `listBankAccounts()` | `createBankAccount(data)` | `updateBankAccount(id, data)` | `deleteBankAccount(id)` |
| Payment Methods | `listPaymentMethods()` | `createPaymentMethod(data)` | `updatePaymentMethod(id, data)` | `deletePaymentMethod(id)` |
| Products | `listProducts()` | `createProduct(data)` | `updateProduct(id, data)` | `deleteProduct(id)` |
| Warehouses | `listWarehouses()` | `createWarehouse(data)` | `updateWarehouse(id, data)` | `deleteWarehouse(id)` |

**Templates**: `listChartTemplates()`, `applyChartTemplate(templateId, options?)`, `listProductTemplates()`, `applyProductTemplate(templateId, options?)`

---

## Schemas de Validacao

### `settlementSchema` (financial.ts)

```
officialEntryId: string (UUID)
date: string (ISO date)
settlementDate?: string (ISO date)
amount: number (> 0)
interestAmount: number (>= 0, default 0)
fineAmount: number (>= 0, default 0)
discountAmount: number (>= 0, default 0)
bankAccountId: string (UUID)
paymentMethodId?: string (UUID)
document?: string
notes?: string
```

### `installmentSchema` (financial.ts)

```
officialEntryId: string (UUID)
numberOfInstallments: number (2-120)
firstDueDate: string (ISO date)
intervalDays: number (1-365, default 30)
```

### `recurringRuleSchema` (financial.ts)

```
name: string (1-200 chars)
description?: string
amount: number (> 0)
type: "CREDIT" | "DEBIT"
category: "PAYABLE" | "RECEIVABLE"
chartOfAccountId?: string
costCenterId?: string
supplierId?: string
customerId?: string
bankAccountId?: string
paymentMethodId?: string
frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL"
dayOfMonth?: number (1-31)
startDate: string (ISO date)
endDate?: string (ISO date)
active: boolean (default true)
```

### `stagingEntrySchema` (staging.ts)

```
date: string (ISO date)
dueDate?: string
competenceDate?: string
description: string (1-500 chars)
amount: number (> 0)
type: "CREDIT" | "DEBIT"
counterpartCnpjCpf?: string
counterpartName?: string
chartOfAccountId?: string
costCenterId?: string
supplierId?: string
customerId?: string
bankAccountId?: string
paymentMethodId?: string
notes?: string
movementType?: string
financialNature?: string
pendingSettlement?: {
  amount: number
  interestAmount?: number
  fineAmount?: number
  discountAmount?: number
  date: string
  bankAccountId: string
  paymentMethodId?: string
}
```

### `classificationRuleSchema` (rules.ts)

```
priority: number (1-1000)
field: "CNPJ" | "DESCRIPTION" | "VALUE_RANGE"
pattern: string
chartOfAccountId?: string
costCenterId?: string
supplierId?: string
customerId?: string
conditionType: "AND" | "OR" (default "AND")
actionType: "CLASSIFY" | "BLOCK" | "ALERT" | "QUEUE"
confidence: number (0-100, default 80)
description?: string
minAmount?: number
maxAmount?: number
supplierPattern?: string
datePattern?: string
active: boolean (default true)
```

### `internalTransferSchema` (rules.ts)

```
sourceAccountId: string (UUID)
targetAccountId: string (UUID)  // deve ser diferente de sourceAccountId
amount: number (> 0)
transferDate: Date
reference?: string (max 200 chars)
```

### Master Data Schemas (master-data.ts)

**chartOfAccountSchema**: code, name, type (REVENUE|DEDUCTION|COST|EXPENSE|INVESTMENT), parentId?, isAnalytic, active

**supplierSchema / customerSchema**: name, tradeName?, cnpjCpf?, stateRegistration?, email?, phone?, address?, city?, state?, zipCode?, notes?, active

**costCenterSchema**: code, name, parentId?, active

**bankAccountSchema**: bankName, bankCode?, agency, accountNumber, accountType (CHECKING|SAVINGS|INVESTMENT), initialBalance, active

**paymentMethodSchema**: name, type (CASH|BANK_TRANSFER|PIX|CREDIT_CARD|DEBIT_CARD|BOLETO|CHECK|OTHER), daysToSettle?, feePercentage?, active

**productSchema**: code, name, description?, unit, costPrice, salePrice?, minStock?, reorderPoint?, active

**warehouseSchema**: name, location?, active

---

## Rate Limiting

O sistema implementa rate limiting in-memory (sliding window) para proteger actions criticas:

| Action | Limite | Janela | Chave |
|--------|--------|--------|-------|
| Imports (todas) | 10 req | 1 min | `import:{tenantId}` |
| Auto-Reconciliacao | 20 req | 1 min | `reconcile:{tenantId}` |
| Incorporacao em Lote | 5 req | 1 min | `staging-batch:{tenantId}` |

Quando excedido, retorna erro: `"Rate limit exceeded. Try again in X seconds."`

> **Nota**: Para producao multi-instancia, substituir por Redis (ex: `@upstash/ratelimit`).

---

## Paginacao

Todas as listagens suportam paginacao server-side via `PaginationParams`:

```typescript
interface PaginationParams {
  page?: number;    // default: 1
  pageSize?: number; // default: 50, max: 200
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**URL params**: As paginas aceitam `?page=N` nos search params para navegacao server-side.

---

## Autenticacao e Autorizacao

- Todas as actions usam `getCurrentUser()` que valida a sessao NextAuth
- Isolamento multi-tenant: todas as queries filtram por `tenantId`
- Actions criticas usam `requireRole(["ADMIN", "CONTROLLER"])` para controle de acesso
- Audit logs sao gerados para operacoes de escrita criticas

---

*Gerado automaticamente a partir dos schemas Zod e server actions do projeto.*
*Ultima atualizacao: 2026-04-11*
