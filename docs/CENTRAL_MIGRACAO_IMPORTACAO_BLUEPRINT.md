# Central de Migracao e Importacao — Blueprint Completo

**Versao:** 1.0
**Data:** 2026-03-28
**Autores:** Equipe Senior (CEO, CTO, Arquiteto, PM, Especialistas)
**Sistema:** Plataforma Financeira BPO Multi-Tenant
**Stack:** Next.js 16 + Prisma 7 + PostgreSQL/Neon + NextAuth 5

---

## INDICE

1. [Visao de Produto](#1-visao-de-produto)
2. [Arquitetura Funcional da Pagina Lateral](#2-arquitetura-funcional)
3. [Modelagem da Importacao](#3-modelagem)
4. [Estrategia Ideal de Importacao](#4-estrategia)
5. [Definicao dos Templates Excel](#5-templates)
6. [Regras de Relacionamento e Ordem de Importacao](#6-ordem)
7. [Mapeamento vindo de outro ERP](#7-mapeamento-erp)
8. [Validacoes e Revisao](#8-validacoes)
9. [UX/UI da Pagina Lateral](#9-uxui)
10. [Seguranca, Rastreabilidade e Auditoria](#10-seguranca)
11. [Exportacao Completa](#11-exportacao)
12. [Melhor Modelo Tecnico](#12-tecnico)
13. [Regras de Negocio Criticas](#13-regras-negocio)
14. [Melhorias no Sistema Atual](#14-melhorias)
15. [Saida Final](#15-saida-final)

---

## 1. VISAO DE PRODUTO

### 1.1 Proposta

A **Central de Migracao e Importacao** e um modulo lateral dedicado que resolve o problema mais critico de qualquer sistema financeiro: **a entrada e saida de dados em massa com seguranca contabil**.

Nao e apenas um "importador de planilha". E uma **sala de controle de dados** onde o operador pode:
- Trazer toda a base de um cliente novo em horas (nao semanas)
- Exportar qualquer dado para auditoria, backup ou conferencia
- Atualizar cadastros em massa sem risco de corrupcao
- Reimportar dados corrigidos com rastreabilidade total
- Migrar de outro ERP com mapeamento assistido

### 1.2 Para quem existe

| Persona | Uso principal |
|---------|--------------|
| **Analista BPO** | Onboarding de novo cliente, importacao operacional recorrente |
| **Controller** | Aprovacao de cargas, conferencia de totais, exportacao para auditoria |
| **Gestor da Empresa** | Acompanhar status da migracao, exportar dados para conferencia |
| **Auditor** | Exportar dados com trilha completa, conferir lotes importados |
| **TI / Implantacao** | Migracao de ERP, carga inicial, mapeamento de plano de contas |

### 1.3 Problemas que resolve

1. **Onboarding lento** — hoje levar 2-4 semanas para ter um cliente 100% operacional. Com este modulo: 2-4 horas.
2. **Importacao fragil** — ERPs tradicionais aceitam planilha e jogam direto na base. Qualquer erro contamina tudo. Aqui: staging + validacao + aprovacao + rollback.
3. **Falta de rastreabilidade** — quem importou, quando, qual arquivo, o que mudou. Trilha completa.
4. **Migracao de ERP traumatica** — sem mapeamento assistido, o usuario tem que adaptar tudo manualmente. Aqui: presets por ERP + de/para inteligente.
5. **Exportacao limitada** — sistemas exportam CSV solto, sem relacionamento. Aqui: Excel estruturado reimportavel com IDs e relacoes.

### 1.4 Diferencial competitivo

| Aspecto | ERP Tradicional | Este Sistema |
|---------|----------------|-------------|
| Importacao | CSV direto na base | Staging → Validacao → Aprovacao → Gravacao |
| Rollback | Inexistente | Por lote, com desfazimento transacional |
| Migracao | Manual, semanas | Assistida, presets por ERP, horas |
| Exportacao | CSV sem relacao | Excel multi-aba reimportavel |
| Validacao | Basica ou nenhuma | 40+ regras com score de confianca |
| Auditoria | Log generico | Trilha por linha, campo, usuario, timestamp |
| Multi-tenant | N/A | Isolamento total por tenant, sem contaminacao cruzada |

---

## 2. ARQUITETURA FUNCIONAL

### 2.1 Estrutura da Pagina Lateral

A Central ocupa uma **rota dedicada** `/migration` com sub-rotas:

```
/migration
  /migration/overview          → Visao geral + metricas
  /migration/templates         → Download de templates + dicionarios
  /migration/new               → Wizard de novo lote
  /migration/batches/[id]      → Detalhe do lote (mapeamento, validacao, revisao)
  /migration/batches/[id]/map  → Mapeamento de colunas
  /migration/batches/[id]/review → Revisao e correcao
  /migration/batches/[id]/approve → Aprovacao final
  /migration/history           → Historico de lotes
  /migration/export            → Central de exportacao
  /migration/erp-mapping       → Configuracao de/para por ERP
```

### 2.2 Fluxo Principal (Wizard de 7 Etapas)

```
[1. Selecionar Tipo]  →  [2. Upload]  →  [3. Mapeamento]  →  [4. Validacao]
         ↓                                                         ↓
[7. Confirmado]  ←  [6. Aprovacao]  ←  [5. Revisao/Correcao]  ←──┘
```

**Etapa 1 — Tipo de Importacao**
- Carga inicial completa (novo cliente)
- Importacao por modulo (cadastros, lancamentos, etc.)
- Atualizacao em massa
- Reimportacao de lote anterior (com correcos)

**Etapa 2 — Upload**
- Drag & drop ou selecao de arquivo
- Aceita: XLSX, ZIP (multiplos XLSX), CSV
- Calcula hash SHA-256 para deduplicacao
- Detecta encoding, separador, formato de data/moeda

**Etapa 3 — Mapeamento de Colunas**
- Auto-deteccao por nome de coluna (fuzzy match)
- Mapeamento manual com drag & drop
- Salvar mapeamento como preset
- Carregar preset por ERP de origem
- Preview das 5 primeiras linhas mapeadas

**Etapa 4 — Validacao em Massa**
- Executa todas as regras de validacao
- Gera relatorio com: erros bloqueantes, warnings, sugestoes
- Score de confianca por linha e por lote
- Totalizadores para conferencia

**Etapa 5 — Revisao e Correcao**
- Visualizacao por entidade (plano de contas, fornecedores, lancamentos...)
- Filtro por criticidade (erros, warnings, ok)
- Edicao inline campo a campo
- Correcao em massa (selecionar N linhas, aplicar valor)
- Descarte de linhas especificas
- Re-validacao apos correcao

**Etapa 6 — Aprovacao**
- Resumo executivo do lote
- Checklist de conferencia (totais, quantidades, entidades)
- Comparativo: total importado vs total esperado (informado pelo usuario)
- Botao de aprovar (requer perfil CONTROLLER ou ADMIN)
- Opcao de agendar gravacao para horario especifico

**Etapa 7 — Gravacao**
- Processamento transacional por entidade
- Barra de progresso em tempo real
- Log de cada registro gravado
- Se falhar: rollback automatico do lote inteiro
- Ao concluir: relatorio final com contadores

### 2.3 Areas Complementares

**Central de Exportacao** (`/migration/export`)
- Exportar tudo (full backup)
- Exportar por modulo
- Exportar por periodo
- Exportar com ou sem metadados
- Formato: XLSX multi-aba (reimportavel)
- Agendar exportacao recorrente

**Historico** (`/migration/history`)
- Lista de todos os lotes (importacao e exportacao)
- Status, data, usuario, totais
- Opcao de reprocessar
- Opcao de desfazer (rollback)
- Download do arquivo original

**Templates** (`/migration/templates`)
- Download de templates vazios por modulo
- Download de template mestre (todas as abas)
- Templates incluem: dicionario de dados, exemplos, validacoes Excel
- Versao do template (para compatibilidade)

---

## 3. MODELAGEM DA IMPORTACAO

### 3.1 Novos Models Prisma

```prisma
// ── MIGRATION BATCH ──────────────────────────────────
enum MigrationBatchType {
  FULL_INITIAL_LOAD      // Carga inicial completa
  MODULE_IMPORT          // Importacao por modulo
  MASS_UPDATE            // Atualizacao em massa
  REIMPORT               // Reimportacao de lote
  EXPORT                 // Exportacao
}

enum MigrationBatchStatus {
  DRAFT                  // Criado, aguardando upload
  UPLOADED               // Arquivo recebido, aguardando mapeamento
  MAPPED                 // Colunas mapeadas, aguardando validacao
  VALIDATING             // Validacao em andamento
  VALIDATED              // Validacao concluida (com ou sem erros)
  REVIEWING              // Em revisao/correcao pelo usuario
  PENDING_APPROVAL       // Aguardando aprovacao
  APPROVED               // Aprovado, aguardando gravacao
  PROCESSING             // Gravacao em andamento
  COMPLETED              // Gravacao concluida com sucesso
  COMPLETED_PARTIAL      // Gravacao parcial (alguns erros)
  FAILED                 // Falha na gravacao
  ROLLED_BACK            // Lote desfeito
  CANCELLED              // Cancelado pelo usuario
}

enum MigrationEntityType {
  CHART_OF_ACCOUNTS
  COST_CENTERS
  SUPPLIERS
  CUSTOMERS
  BANK_ACCOUNTS
  PAYMENT_METHODS
  CLASSIFICATION_RULES
  VALIDATION_RULES
  STAGING_ENTRIES
  OFFICIAL_ENTRIES
  SETTLEMENTS
  RECONCILIATIONS
  INSTALLMENTS
  RECURRING_RULES
  INTERNAL_TRANSFERS
  OPENING_BALANCES
  PRODUCTS
  WAREHOUSES
}

enum MigrationItemStatus {
  PENDING                // Aguardando validacao
  VALID                  // Validado sem erros
  WARNING                // Validado com avisos
  ERROR                  // Com erro bloqueante
  SKIPPED                // Descartado pelo usuario
  DUPLICATE              // Detectado como duplicata
  IMPORTED               // Gravado com sucesso
  FAILED                 // Falha na gravacao
  ROLLED_BACK            // Desfeito
}

enum MigrationSeverity {
  ERROR                  // Bloqueante
  WARNING                // Nao-bloqueante
  INFO                   // Informativo/sugestao
}

model MigrationBatch {
  id                String               @id @default(cuid())
  tenantId          String
  type              MigrationBatchType
  status            MigrationBatchStatus @default(DRAFT)
  name              String               // Nome amigavel do lote
  description       String?

  // Arquivo
  fileName          String?
  fileHash          String?              // SHA-256
  fileSize          Int?                 // bytes
  templateVersion   String?              // Versao do template usado

  // ERP de origem (para migracao)
  sourceErpName     String?              // Ex: "Omie", "Totvs", "Dominio"
  sourceErpPresetId String?              // Preset de mapeamento

  // Contadores
  totalRows         Int                  @default(0)
  validRows         Int                  @default(0)
  warningRows       Int                  @default(0)
  errorRows         Int                  @default(0)
  skippedRows       Int                  @default(0)
  importedRows      Int                  @default(0)

  // Totais financeiros para conferencia
  expectedTotalAmount  Decimal?          // Informado pelo usuario
  calculatedTotalAmount Decimal?         // Calculado do arquivo

  // Controle
  mappingConfig     Json?                // Configuracao de mapeamento salva
  validationReport  Json?                // Relatorio resumido de validacao
  approvalChecklist Json?                // Checklist de aprovacao

  // Rollback
  rollbackData      Json?                // Dados para desfazer
  rollbackAt        DateTime?
  rollbackById      String?

  // Timestamps e usuarios
  createdById       String
  approvedById      String?
  approvedAt        DateTime?
  processedAt       DateTime?
  completedAt       DateTime?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  // Relations
  tenant            Tenant               @relation(fields: [tenantId], references: [id])
  createdBy         User                 @relation("MigrationCreatedBy", fields: [createdById], references: [id])
  approvedBy        User?                @relation("MigrationApprovedBy", fields: [approvedById], references: [id])
  rollbackBy        User?                @relation("MigrationRolledBackBy", fields: [rollbackById], references: [id])
  items             MigrationItem[]
  errors            MigrationError[]
  entitySummaries   MigrationEntitySummary[]
}

model MigrationItem {
  id                String               @id @default(cuid())
  batchId           String
  entityType        MigrationEntityType
  status            MigrationItemStatus  @default(PENDING)
  rowNumber         Int                  // Linha no arquivo original
  sheetName         String?              // Aba do Excel

  // Dados originais (como vieram do arquivo)
  rawData           Json                 // Linha original completa

  // Dados mapeados (apos mapeamento de colunas)
  mappedData        Json?                // Dados convertidos para schema interno

  // Dados corrigidos (apos revisao do usuario)
  correctedData     Json?                // Se o usuario corrigiu algo

  // Resultado
  resultId          String?              // ID do registro criado no destino
  resultType        String?              // Tabela destino

  // Deduplicacao
  deduplicationKey  String?              // Chave para detectar duplicata
  existingRecordId  String?              // Se ja existe registro com essa chave

  // IDs externos
  externalId        String?              // ID no ERP de origem

  // Score
  confidenceScore   Int?                 // 0-100

  // Timestamps
  validatedAt       DateTime?
  importedAt        DateTime?
  createdAt         DateTime             @default(now())

  // Relations
  batch             MigrationBatch       @relation(fields: [batchId], references: [id], onDelete: Cascade)
  errors            MigrationError[]

  @@index([batchId, entityType])
  @@index([batchId, status])
  @@index([deduplicationKey])
}

model MigrationError {
  id                String               @id @default(cuid())
  batchId           String
  itemId            String?              // Null = erro de lote, nao de linha
  severity          MigrationSeverity
  field             String?              // Campo com problema
  code              String               // Codigo do erro (ex: "DUPLICATE_CNPJ")
  message           String               // Mensagem legivel
  suggestion        String?              // Sugestao de correcao
  resolved          Boolean              @default(false)
  resolvedAt        DateTime?

  // Relations
  batch             MigrationBatch       @relation(fields: [batchId], references: [id], onDelete: Cascade)
  item              MigrationItem?       @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([batchId, severity])
}

model MigrationEntitySummary {
  id                String               @id @default(cuid())
  batchId           String
  entityType        MigrationEntityType
  totalRows         Int                  @default(0)
  validRows         Int                  @default(0)
  errorRows         Int                  @default(0)
  warningRows       Int                  @default(0)
  skippedRows       Int                  @default(0)
  importedRows      Int                  @default(0)
  financialTotal    Decimal?             // Soma dos valores financeiros da entidade

  batch             MigrationBatch       @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@unique([batchId, entityType])
}

model MigrationMapping {
  id                String               @id @default(cuid())
  tenantId          String
  name              String               // Nome do mapeamento
  sourceErpName     String?              // ERP de origem
  entityType        MigrationEntityType
  columnMapping     Json                 // { "coluna_origem": "campo_destino", ... }
  transformations   Json?                // Regras de transformacao (formatos, de/para)
  isDefault         Boolean              @default(false)
  createdById       String
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  tenant            Tenant               @relation(fields: [tenantId], references: [id])
  createdBy         User                 @relation("MappingCreatedBy", fields: [createdById], references: [id])

  @@unique([tenantId, name, entityType])
}
```

### 3.2 Campos a adicionar nos models existentes

```prisma
// Em Tenant:
  migrationBatches    MigrationBatch[]
  migrationMappings   MigrationMapping[]

// Em User:
  migrationBatchesCreated   MigrationBatch[]  @relation("MigrationCreatedBy")
  migrationBatchesApproved  MigrationBatch[]  @relation("MigrationApprovedBy")
  migrationBatchesRolledBack MigrationBatch[] @relation("MigrationRolledBackBy")
  migrationMappingsCreated  MigrationMapping[] @relation("MappingCreatedBy")

// Em StagingEntry (campos faltantes — ver secao 14):
  dueDate             DateTime?
  competenceDate      DateTime?
  originalDueDate     DateTime?
  category            EntryCategory?
  documentNumber      String?
  externalId          String?
  migrationBatchId    String?
  migrationItemId     String?

// Em OfficialEntry:
  externalId          String?
  migrationBatchId    String?
```

---

## 4. ESTRATEGIA IDEAL DE IMPORTACAO

### 4.1 Comparativo

| Estrategia | Vantagens | Desvantagens | Nota |
|-----------|-----------|-------------|------|
| Excel unico multi-aba | Simples, um arquivo | Limite de tamanho, relacoes entre abas confusas | 7/10 |
| Multiplos XLSX separados | Claro por entidade | Usuario precisa fazer N uploads | 6/10 |
| ZIP com multiplos XLSX | Um upload, organizacao por entidade | Complexidade para montar o ZIP | 8/10 |
| Wizard guiado por entidade | Melhor UX, passo a passo | Mais lento para cargas grandes | 7/10 |
| **Hibrida: XLSX multi-aba OU ZIP** | Flexibilidade maxima | Precisa detectar formato | **9/10** |

### 4.2 Decisao: Abordagem Hibrida Inteligente

**Recomendacao: aceitar qualquer formato e detectar automaticamente.**

```
Arquivo recebido
  ├── Se XLSX: detectar abas, mapear cada aba para uma entidade
  ├── Se ZIP: extrair, processar cada XLSX separadamente
  └── Se CSV: pedir que o usuario informe qual entidade

Para carga inicial: XLSX multi-aba (um arquivo, ate 18 abas)
Para atualizacao pontual: XLSX de aba unica (mais simples)
Para migracao de ERP grande: ZIP com multiplos XLSX
```

**Justificativa:**
1. Usuarios nao-tecnicos preferem um unico arquivo Excel — mais intuitivo.
2. Para volumes grandes (>50k linhas), o ZIP com arquivos separados escala melhor.
3. A deteccao automatica elimina fricao — o usuario nao precisa escolher formato.
4. O template mestre ja vem com todas as abas nomeadas corretamente, eliminando erro de nomenclatura.

### 4.3 Template Mestre (XLSX multi-aba)

Um unico arquivo XLSX com as seguintes abas, na ordem de importacao:

```
Aba 01: _INSTRUCOES         (aba protegida, somente leitura)
Aba 02: _DICIONARIO          (aba protegida, lista campos/tipos/obrigatoriedade)
Aba 03: plano_de_contas
Aba 04: centros_de_custo
Aba 05: fornecedores
Aba 06: clientes
Aba 07: bancos_contas
Aba 08: formas_pagamento
Aba 09: regras_classificacao
Aba 10: regras_validacao
Aba 11: saldos_iniciais
Aba 12: lancamentos_staging
Aba 13: lancamentos_oficiais
Aba 14: baixas_liquidacoes
Aba 15: parcelas
Aba 16: recorrencias
Aba 17: transferencias
Aba 18: conciliacoes
Aba 19: produtos
Aba 20: depositos
```

---

## 5. DEFINICAO DOS TEMPLATES EXCEL

### 5.1 Estrutura de Cada Aba

Cada aba de dados segue o padrao:

- **Linha 1**: Cabecalho principal (nomes das colunas em portugues)
- **Linha 2**: Cabecalho tecnico (nome do campo no banco, cinza claro)
- **Linha 3**: Tipo de dado + obrigatoriedade (ex: "texto | obrigatorio")
- **Linha 4**: Exemplo preenchido (linha de demonstracao, fundo amarelo)
- **Linha 5+**: Dados reais

### 5.2 Colunas Padrao (presentes em TODAS as abas de dados)

| Coluna | Campo tecnico | Tipo | Obrigatorio | Descricao |
|--------|-------------|------|-------------|-----------|
| ID Externo | external_id | texto | Nao | ID do registro no sistema de origem |
| Acao | _action | texto | Nao | CREATE (padrao), UPDATE, SKIP |

Quando `_action = UPDATE`:
- O sistema busca o registro existente por `external_id` ou por chave natural (ex: CNPJ para fornecedor, code para plano de contas)
- Atualiza apenas os campos preenchidos (merge)
- Campos vazios nao sobrescrevem

Quando `_action = SKIP`:
- A linha e ignorada na importacao

### 5.3 Template: plano_de_contas

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | Livre |
| Codigo | code | texto | **S** | Unico por tenant |
| Nome | name | texto | **S** | Min 2 chars |
| Tipo | type | enum | **S** | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| Nivel | level | inteiro | N | 1-9 |
| Codigo Pai | parent_code | texto | N | Deve existir no plano |
| Analitica | is_analytic | booleano | N | SIM/NAO, padrao SIM |
| Ativa | active | booleano | N | SIM/NAO, padrao SIM |

**Chave de deduplicacao**: `code` (unico por tenant)
**Relacionamento**: `parent_code` referencia outra linha da mesma aba ou registro existente

### 5.4 Template: fornecedores / clientes

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | Livre |
| Razao Social | name | texto | **S** | Min 2 chars |
| Nome Fantasia | trade_name | texto | N | |
| CNPJ/CPF | cnpj_cpf | texto | **S** | 11 ou 14 digitos, unico |
| IE | state_registration | texto | N | |
| Email | email | email | N | Formato valido |
| Telefone | phone | texto | N | |
| Endereco | address | texto | N | |
| Cidade | city | texto | N | |
| Estado | state | texto | N | 2 chars (UF) |
| CEP | zip_code | texto | N | 8 digitos |
| Observacoes | notes | texto | N | |
| Ativo | active | booleano | N | SIM/NAO, padrao SIM |

**Chave de deduplicacao**: `cnpj_cpf` (unico por tenant)

### 5.5 Template: centros_de_custo

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | |
| Codigo | code | texto | **S** | Unico por tenant |
| Nome | name | texto | **S** | Min 2 chars |
| Codigo Pai | parent_code | texto | N | Deve existir |
| Ativo | active | booleano | N | SIM/NAO |

**Chave de deduplicacao**: `code`

### 5.6 Template: bancos_contas

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | |
| Banco | bank_name | texto | **S** | |
| Codigo Banco | bank_code | texto | **S** | 3 digitos |
| Agencia | agency | texto | **S** | |
| Numero Conta | account_number | texto | **S** | |
| Tipo | account_type | enum | N | CHECKING, SAVINGS, INVESTMENT |
| Saldo Inicial | initial_balance | decimal | N | Padrao 0.00 |
| Ativo | active | booleano | N | SIM/NAO |

**Chave de deduplicacao**: `bank_code + agency + account_number`

### 5.7 Template: formas_pagamento

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | |
| Nome | name | texto | **S** | |
| Tipo | type | enum | **S** | CASH, BANK_TRANSFER, PIX, CREDIT_CARD, DEBIT_CARD, BOLETO, CHECK, OTHER |
| Dias p/ Liquidar | days_to_settle | inteiro | N | >= 0 |
| Taxa % | fee_percentage | decimal | N | 0-100 |
| Ativo | active | booleano | N | SIM/NAO |

### 5.8 Template: saldos_iniciais

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| Codigo Banco | bank_code | texto | **S** | Deve existir |
| Agencia | agency | texto | **S** | Deve existir |
| Numero Conta | account_number | texto | **S** | Deve existir |
| Data Saldo | balance_date | data | **S** | |
| Saldo | balance_amount | decimal | **S** | |

**Logica**: Atualiza `initialBalance` e `currentBalance` da conta bancaria na data especificada.

### 5.9 Template: lancamentos_staging

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | |
| Data | date | data | **S** | DD/MM/AAAA |
| Data Competencia | competence_date | data | N | Se vazio, usa date |
| Data Vencimento | due_date | data | N | |
| Descricao | description | texto | **S** | Min 3 chars |
| Valor | amount | decimal | **S** | > 0 |
| Tipo | type | enum | **S** | CREDIT, DEBIT (ou C, D) |
| Categoria | category | enum | N | PAYABLE, RECEIVABLE, TRANSFER, ADJUSTMENT |
| CNPJ/CPF Contraparte | counterpart_cnpj | texto | N | |
| Nome Contraparte | counterpart_name | texto | N | |
| Codigo Conta Contabil | chart_of_account_code | texto | N | Deve existir no plano |
| Codigo Centro Custo | cost_center_code | texto | N | Deve existir |
| CNPJ Fornecedor | supplier_cnpj | texto | N | Deve existir cadastro |
| CNPJ Cliente | customer_cnpj | texto | N | Deve existir cadastro |
| Banco (codigo) | bank_code | texto | N | Deve existir |
| Agencia | bank_agency | texto | N | |
| Conta | bank_account | texto | N | |
| Forma Pagamento | payment_method_name | texto | N | Deve existir |
| Nr Documento | document_number | texto | N | |
| Tipo Movimento | movement_type | enum | N | ENTRY, EXIT, TRANSFER, ADJUSTMENT |
| Natureza Financeira | financial_nature | enum | N | OPERATIONAL, NON_OPERATIONAL, FINANCIAL, PATRIMONIAL |
| Observacoes | notes | texto | N | |

**Chave de deduplicacao**: `external_id` OU `date + description + amount + type`

### 5.10 Template: lancamentos_oficiais

Mesmas colunas do staging + campos adicionais:

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ... (todas do staging) | | | | |
| Status | status | enum | N | OPEN, PARTIAL, SETTLED, CANCELLED. Padrao: OPEN |
| Valor Pago | paid_amount | decimal | N | <= amount |
| Data Pagamento | paid_date | data | N | |
| Juros | interest_amount | decimal | N | |
| Multa | fine_amount | decimal | N | |
| Desconto | discount_amount | decimal | N | |
| Nr Parcela | installment_number | inteiro | N | |
| Total Parcelas | total_installments | inteiro | N | |
| Grupo Parcela | installment_group | texto | N | Para agrupar parcelas |

### 5.11 Template: baixas_liquidacoes

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo Lancamento | entry_external_id | texto | **S** | Deve existir |
| Data Baixa | date | data | **S** | |
| Data Liquidacao | settlement_date | data | N | |
| Valor | amount | decimal | **S** | > 0 |
| Juros | interest | decimal | N | |
| Multa | fine | decimal | N | |
| Desconto | discount | decimal | N | |
| Banco (codigo) | bank_code | texto | **S** | |
| Agencia | bank_agency | texto | **S** | |
| Conta | bank_account | texto | **S** | |
| Forma Pagamento | payment_method | texto | N | |
| Documento | document | texto | N | |
| Observacoes | notes | texto | N | |

### 5.12 Template: transferencias

| Coluna PT-BR | Campo | Tipo | Obrigatorio | Validacao |
|-------------|-------|------|-------------|-----------|
| ID Externo | external_id | texto | N | |
| Banco Origem | source_bank_code | texto | **S** | |
| Agencia Origem | source_agency | texto | **S** | |
| Conta Origem | source_account | texto | **S** | |
| Banco Destino | target_bank_code | texto | **S** | |
| Agencia Destino | target_agency | texto | **S** | |
| Conta Destino | target_account | texto | **S** | |
| Valor | amount | decimal | **S** | > 0 |
| Data | transfer_date | data | **S** | |
| Referencia | reference | texto | N | |

### 5.13 Relacionamentos entre abas (Chaves Estrangeiras)

As chaves estrangeiras usam **chaves naturais** (nao IDs internos):

| De (aba) | Campo | Para (aba) | Chave |
|----------|-------|-----------|-------|
| plano_de_contas | parent_code | plano_de_contas | code |
| centros_de_custo | parent_code | centros_de_custo | code |
| lancamentos_* | chart_of_account_code | plano_de_contas | code |
| lancamentos_* | cost_center_code | centros_de_custo | code |
| lancamentos_* | supplier_cnpj | fornecedores | cnpj_cpf |
| lancamentos_* | customer_cnpj | clientes | cnpj_cpf |
| lancamentos_* | bank_code+agency+account | bancos_contas | chave composta |
| lancamentos_* | payment_method_name | formas_pagamento | name |
| baixas | entry_external_id | lancamentos_oficiais | external_id |
| transferencias | source/target | bancos_contas | chave composta |

**Principio**: O usuario nunca precisa saber IDs internos. Usa codigos, CNPJs e nomes.

---

## 6. REGRAS DE RELACIONAMENTO E ORDEM DE IMPORTACAO

### 6.1 Ordem de Importacao (Topologica)

```
NIVEL 0 — Base (sem dependencias):
  ├── Plano de Contas (nivei pai antes de filho)
  ├── Centros de Custo (nivel pai antes de filho)
  ├── Formas de Pagamento
  └── Produtos / Depositos

NIVEL 1 — Cadastros com referencia a nivel 0:
  ├── Fornecedores
  ├── Clientes
  └── Contas Bancarias

NIVEL 2 — Parametros que dependem de nivel 0+1:
  ├── Regras de Classificacao (ref: plano contas, CC, fornecedores, clientes)
  ├── Regras de Validacao
  └── Saldos Iniciais (ref: contas bancarias)

NIVEL 3 — Lancamentos:
  ├── Lancamentos em Staging (ref: plano contas, CC, fornecedores, clientes, bancos)
  └── Lancamentos Oficiais (ref: idem + status, parcela)

NIVEL 4 — Operacoes sobre lancamentos:
  ├── Baixas/Liquidacoes (ref: lancamentos oficiais, bancos)
  ├── Parcelas (agrupamento dentro de lancamentos oficiais)
  └── Transferencias Internas (ref: contas bancarias)

NIVEL 5 — Conciliacao (ref: lancamentos oficiais + extrato bancario):
  └── Conciliacoes

NIVEL 6 — Recorrencias (ref: tudo):
  └── Regras de Recorrencia
```

### 6.2 Tratamento de Dependencias Pendentes

**Cenario**: Lancamento referencia conta contabil `3.1.01.001` que ainda nao existe.

**Estrategia: Validacao Relacional em 2 Fases**

**Fase 1 — Intra-lote**: Verifica se a dependencia existe dentro do proprio lote (em outra aba). Se sim, marca como "resolvido intra-lote" e processa na ordem correta.

**Fase 2 — Inter-base**: Verifica se a dependencia existe na base atual do tenant. Se sim, faz o link automaticamente.

**Se nenhum resolve**: Gera erro com `severity: ERROR`, campo, valor e sugestao:
```
ERRO: Conta contabil '3.1.01.001' nao encontrada
Campo: chart_of_account_code
Linha: 47
Sugestao: Adicione essa conta na aba 'plano_de_contas' ou verifique o codigo
```

### 6.3 Registros Circulares

Plano de contas e centros de custo podem ter hierarquia (pai/filho). A importacao ordena automaticamente: processa primeiro os registros sem `parent_code`, depois os que referenciam registros ja criados, iterativamente. Maximo 10 niveis.

---

## 7. MAPEAMENTO VINDO DE OUTRO ERP

### 7.1 Modelo de Mapeamento

Cada preset de ERP define:

```json
{
  "erpName": "Omie",
  "version": "1.0",
  "entities": {
    "CHART_OF_ACCOUNTS": {
      "columnMapping": {
        "cCodigo": "code",
        "cDescricao": "name",
        "cNatureza": "type"
      },
      "valueTransformations": {
        "type": {
          "D": "EXPENSE",
          "R": "REVENUE",
          "A": "ASSET",
          "P": "LIABILITY",
          "PL": "EQUITY"
        }
      },
      "dateFormat": "DD/MM/YYYY",
      "decimalSeparator": ",",
      "thousandsSeparator": "."
    },
    "SUPPLIERS": {
      "columnMapping": {
        "razao_social": "name",
        "cnpj_cpf": "cnpj_cpf",
        "telefone1_ddd": { "concat": ["phone_ddd", "phone_number"] }
      }
    }
    // ... demais entidades
  }
}
```

### 7.2 Presets Pre-Configurados

| ERP | Prioridade | Justificativa |
|-----|-----------|---------------|
| **Omie** | Alta | Muito usado por PMEs, exporta Excel facilmente |
| **Dominio (Thomson Reuters)** | Alta | Padrao em escritorios contabeis |
| **Totvs Protheus** | Media | Grandes empresas |
| **Conta Azul** | Media | PMEs |
| **Bling** | Media | E-commerce |
| **SAP Business One** | Baixa | Customizacoes variam muito |
| **Generico** | Sempre | Mapeamento manual |

### 7.3 Equivalencias

**Plano de contas externo → interno**:
- Se o tenant ja tem plano de contas: criar tabela de/para
- Se nao tem: importar o plano do ERP de origem como base
- Opcionalmente: aplicar template padrao e mapear codigos antigos para novos

**Status de lancamentos**:
```
Omie "Pago" → SETTLED
Omie "Pendente" → OPEN
Omie "Vencido" → OPEN (marcar como overdue no calculo)
Omie "Cancelado" → CANCELLED
```

**Categorias**:
```
Omie "Conta a Pagar" → PAYABLE
Omie "Conta a Receber" → RECEIVABLE
Omie "Transferencia" → TRANSFER
```

**Formatos de data**:
- Auto-detectar: DD/MM/AAAA, MM/DD/AAAA, AAAA-MM-DD, DD-MM-AAAA
- Fallback: pedir ao usuario para confirmar formato

**Formatos de moeda**:
- Brasileiro: `1.234,56` (separador decimal = virgula)
- Internacional: `1,234.56` (separador decimal = ponto)
- Auto-detectar pela presenca de `,` e `.` nas colunas decimais

### 7.4 Normalizacao de Descricoes

Regras aplicadas automaticamente:
1. Trim de espacos
2. Remover quebras de linha
3. Normalizar acentos (manter, mas normalizar unicode)
4. Uppercase para CNPJ/CPF
5. Remover zeros a esquerda de codigos numericos (opcional, configuravel)
6. Truncar descricoes muito longas com aviso

---

## 8. VALIDACOES E REVISAO

### 8.1 Catalogo de Validacoes (48 regras)

#### Erros Bloqueantes (impedem gravacao)

| Codigo | Descricao | Entidades |
|--------|-----------|-----------|
| E001 | Campo obrigatorio vazio | Todas |
| E002 | Tipo de dado invalido (texto em campo numerico, etc.) | Todas |
| E003 | Valor negativo em campo que exige positivo | Lancamentos, Baixas |
| E004 | Data invalida ou fora de formato | Todas |
| E005 | CNPJ/CPF com digito verificador invalido | Fornecedores, Clientes |
| E006 | Conta contabil nao encontrada (nem no lote, nem na base) | Lancamentos |
| E007 | Centro de custo nao encontrado | Lancamentos |
| E008 | Fornecedor/Cliente nao encontrado | Lancamentos |
| E009 | Conta bancaria nao encontrada | Lancamentos, Baixas, Transferencias |
| E010 | Forma de pagamento nao encontrada | Lancamentos, Baixas |
| E011 | Lancamento referenciado pela baixa nao encontrado | Baixas |
| E012 | Valor da baixa excede saldo em aberto | Baixas |
| E013 | Periodo contabil fechado (PeriodLock) | Lancamentos, Baixas |
| E014 | Duplicata exata detectada (mesma chave, mesmo lote) | Todas |
| E015 | Codigo de plano de contas duplicado | Plano de Contas |
| E016 | CNPJ/CPF duplicado | Fornecedores, Clientes |
| E017 | Conta bancaria duplicada (bank_code+agency+account) | Contas Bancarias |
| E018 | Referencia circular no plano de contas / centro de custo | Hierarquicas |
| E019 | Conta pai nao encontrada | Plano de Contas, CC |
| E020 | Transferencia com mesma conta origem e destino | Transferencias |
| E021 | Enum invalido (valor nao existe nas opcoes) | Todas |
| E022 | Codigo de aba/entidade nao reconhecido | Geral |

#### Warnings (nao bloqueiam, mas alertam)

| Codigo | Descricao | Entidades |
|--------|-----------|-----------|
| W001 | Duplicata provavel com registro existente na base | Todas |
| W002 | Lancamento com valor muito alto (> 3x media) | Lancamentos |
| W003 | Lancamento com data futura (> 30 dias) | Lancamentos |
| W004 | Baixa com data anterior ao lancamento | Baixas |
| W005 | Competencia muito diferente da data do lancamento | Lancamentos |
| W006 | Vencimento anterior a data do lancamento | Lancamentos |
| W007 | Fornecedor/Cliente com CNPJ similar (possivel duplicata) | Cadastros |
| W008 | Conta contabil nao-analitica sendo usada em lancamento | Lancamentos |
| W009 | Lancamento sem conta contabil atribuida | Lancamentos |
| W010 | Lancamento sem centro de custo | Lancamentos |
| W011 | Lancamento PAYABLE sem fornecedor | Lancamentos |
| W012 | Lancamento RECEIVABLE sem cliente | Lancamentos |
| W013 | Saldo inicial difere do saldo calculado | Saldos |
| W014 | Lancamento ja incorporado com mesmo external_id | Lancamentos |
| W015 | Descricao truncada | Todas |
| W016 | Total do lote difere do total esperado (informado pelo usuario) | Geral |

#### Sugestoes Automaticas (INFO)

| Codigo | Descricao |
|--------|-----------|
| I001 | "Encontramos um fornecedor com CNPJ similar: X. Deseja usar?" |
| I002 | "Esta descricao combina com a regra de classificacao Y" |
| I003 | "Sugerimos categoria PAYABLE com base no tipo DEBIT" |
| I004 | "Data de competencia nao informada, usando data do lancamento" |
| I005 | "Formato de data detectado: DD/MM/AAAA. Confirma?" |
| I006 | "Encontramos N parcelas com mesmo grupo. Agrupar automaticamente?" |

### 8.2 Score de Confianca por Linha

```
Score = 100
  - 20 se algum campo obrigatorio inferido (nao fornecido pelo usuario)
  - 15 se duplicata provavel (W001)
  - 10 por cada warning ativo
  - 5 se external_id ausente (nao rastreavel ao ERP de origem)
  + 10 se todas as referencias resolvidas
  + 5 se classificacao automatica match com confianca >= 80
```

Score final: `max(0, min(100, score))`

| Faixa | Cor | Significado |
|-------|-----|-------------|
| 90-100 | Verde | Alta confianca |
| 70-89 | Amarelo | Revisao recomendada |
| 50-69 | Laranja | Revisao necessaria |
| 0-49 | Vermelho | Risco alto |

### 8.3 Checklist Final de Aprovacao

Antes da gravacao, o aprovador deve confirmar:

```
□ Total de registros confere com o esperado
□ Total financeiro confere com o esperado (se informado)
□ Nao ha erros bloqueantes nao resolvidos
□ Warnings foram revisados e aceitos
□ Periodo contabil esta aberto para as datas importadas
□ Backup do estado atual foi realizado (automatico)
□ Confirmo que este lote pode ser gravado na base oficial
```

---

## 9. UX/UI DA PAGINA LATERAL

### 9.1 Navegacao Lateral (dentro de /migration)

```
📦 Central de Migracao
├── 📊 Visao Geral                    /migration/overview
├── 📋 Templates                       /migration/templates
├── ➕ Nova Importacao                 /migration/new
├── 📤 Exportar Dados                  /migration/export
├── 🔄 Mapeamento de ERPs              /migration/erp-mapping
├── 📜 Historico                       /migration/history
└── ⚙️ Configuracoes                   /migration/settings
```

### 9.2 Tela: Visao Geral (`/migration/overview`)

```
┌──────────────────────────────────────────────────────────┐
│  Central de Migracao e Importacao                        │
│  "Gerencie dados em massa com seguranca"                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │   12    │  │    3    │  │    1    │  │   8     │   │
│  │ Lotes   │  │ Em And. │  │Pend.Apr.│  │ Conclu. │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
│                                                          │
│  ┌── Ultimos Lotes ─────────────────────────────────┐   │
│  │ Nome          Tipo      Status     Data    Linhas │   │
│  │ Carga Ini..   FULL      ✅ OK     25/03   1.247  │   │
│  │ Fornecedores  MODULE    🔄 Rev.   27/03     45   │   │
│  │ Atualizacao   UPDATE    ⏳ Pend.  28/03    312   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [+ Nova Importacao]  [📤 Exportar]  [📋 Templates]    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 9.3 Tela: Wizard de Nova Importacao (`/migration/new`)

```
Etapa 1/7: Tipo de Importacao
═══════════════════════════════

┌─────────────────────┐  ┌─────────────────────┐
│ 📦 Carga Inicial    │  │ 📋 Por Modulo       │
│ Novo cliente, base  │  │ Fornecedores,       │
│ completa do zero    │  │ plano de contas...  │
│ [Selecionar]        │  │ [Selecionar]        │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐
│ 🔄 Atualizacao      │  │ 🔁 Reimportacao     │
│ Atualizar registros │  │ Corrigir lote       │
│ existentes em massa │  │ anterior            │
│ [Selecionar]        │  │ [Selecionar]        │
└─────────────────────┘  └─────────────────────┘

ERP de Origem (opcional):
┌──────────────────────────┐
│ Selecione o ERP...    ▾  │
│ • Omie                   │
│ • Dominio                │
│ • Totvs                  │
│ • Conta Azul             │
│ • Generico               │
└──────────────────────────┘
```

### 9.4 Tela: Upload (Etapa 2)

```
Etapa 2/7: Upload do Arquivo
═════════════════════════════

┌─────────────────────────────────────────┐
│                                         │
│       ┌─────────────────────┐          │
│       │   📁 Arraste seu    │          │
│       │   arquivo aqui      │          │
│       │   ou clique para    │          │
│       │   selecionar        │          │
│       │                     │          │
│       │   XLSX, ZIP, CSV    │          │
│       │   Max: 50MB         │          │
│       └─────────────────────┘          │
│                                         │
│   📋 Ou baixe o template primeiro:     │
│   [⬇ Template Mestre]                  │
│   [⬇ Apenas Fornecedores]             │
│   [⬇ Apenas Lancamentos]              │
│                                         │
└─────────────────────────────────────────┘
```

### 9.5 Tela: Mapeamento (Etapa 3)

```
Etapa 3/7: Mapeamento de Colunas
══════════════════════════════════

Aba: "fornecedores" (45 linhas detectadas)

Coluna do Arquivo    →    Campo do Sistema      Status
─────────────────────────────────────────────────────────
razao_social         →    name                  ✅ Auto
cnpj                 →    cnpj_cpf              ✅ Auto
nome_fantasia        →    trade_name            ✅ Auto
fone                 →    phone                 ⚠️ Similar
endereco_completo    →    address               ⚠️ Similar
cod_ibge             →    (ignorar)             ⬜ Nao mapeado
observacao_interna   →    notes                 🔧 Manual

Preview (5 primeiras linhas):
┌─────────────────┬────────────────┬──────────────────┐
│ name            │ cnpj_cpf       │ trade_name       │
├─────────────────┼────────────────┼──────────────────┤
│ Empresa ABC     │ 12345678000190 │ ABC Materiais    │
│ Comercio XYZ    │ 98765432000111 │ XYZ              │
└─────────────────┴────────────────┴──────────────────┘

[💾 Salvar mapeamento como preset]    [Proximo →]
```

### 9.6 Tela: Validacao (Etapa 4)

```
Etapa 4/7: Validacao
═════════════════════

Validando... ████████████░░░░ 78%

Resultados:
┌────────────────────────────────────────────────┐
│  1.247 linhas analisadas                       │
│                                                │
│  ✅  1.180  Validas (94.6%)                    │
│  ⚠️     42  Com avisos (3.4%)                  │
│  ❌     25  Com erros (2.0%)                   │
│                                                │
│  Por entidade:                                 │
│  Plano de Contas    142 ✅  0 ⚠️   0 ❌      │
│  Fornecedores        43 ✅  2 ⚠️   0 ❌      │
│  Clientes            38 ✅  0 ⚠️   1 ❌      │
│  Lancamentos        890 ✅ 35 ⚠️  22 ❌      │
│  Baixas              67 ✅  5 ⚠️   2 ❌      │
│                                                │
│  Total financeiro: R$ 1.234.567,89             │
│  Esperado:         R$ 1.234.567,89  ✅ OK     │
└────────────────────────────────────────────────┘

[← Voltar]  [🔍 Revisar Erros (25)]  [Proximo →]
```

### 9.7 Tela: Revisao (Etapa 5)

```
Etapa 5/7: Revisao e Correcao
═══════════════════════════════

Filtros: [Todos ▾] [Erros ▾] [Entidade ▾] [Buscar...]

┌──────────────────────────────────────────────────────────┐
│ ❌ Linha 47 — Lancamento                                 │
│ Erro: Conta contabil '3.1.01.001' nao encontrada         │
│ Sugestao: Conta similar encontrada: '3.1.01.002'         │
│                                                          │
│ Data: 15/03/2026  Descr: Pagamento energia               │
│ Valor: R$ 1.250,00  Tipo: DEBIT                         │
│                                                          │
│ Conta contabil: [3.1.01.001_______] → [3.1.01.002 ▾]   │
│                                                          │
│ [✅ Aplicar sugestao] [✏️ Editar] [🗑️ Descartar linha] │
├──────────────────────────────────────────────────────────┤
│ ⚠️ Linha 123 — Fornecedor                                │
│ Warning: CNPJ similar ao fornecedor existente "ABC Ltda" │
│                                                          │
│ [🔗 Vincular ao existente] [➕ Criar novo] [🗑️ Pular]  │
└──────────────────────────────────────────────────────────┘

Acoes em massa:
[Selecionar todos os erros] [Aplicar sugestoes automaticas]
[Descartar linhas com erro] [Re-validar]

25 erros | 42 avisos | Pagina 1 de 3
```

### 9.8 Tela: Aprovacao (Etapa 6)

```
Etapa 6/7: Aprovacao Final
═══════════════════════════

Resumo do Lote "Carga Inicial - Cliente ABC"
─────────────────────────────────────────────

📊 Numeros:
  Total de registros:       1.222 (25 descartados)
  Erros resolvidos:         25/25 ✅
  Warnings aceitos:         42/42 ✅
  Score medio:              91/100

💰 Totais Financeiros:
  Lancamentos:              R$ 1.234.567,89
  Baixas:                   R$   987.654,32
  Transferencias:           R$    45.000,00

📋 Checklist de Aprovacao:
  ☑ Total de registros confere
  ☑ Total financeiro confere com esperado
  ☑ Sem erros bloqueantes pendentes
  ☑ Warnings revisados
  ☑ Periodos contabeis abertos
  ☑ Snapshot do estado atual salvo
  ☐ Confirmo gravacao → [CONFIRMAR]

[← Revisar novamente]  [🚫 Cancelar lote]

⚠️ Requer perfil CONTROLLER ou ADMIN para aprovar
```

---

## 10. SEGURANCA, RASTREABILIDADE E AUDITORIA

### 10.1 Permissoes por Perfil

| Acao | VIEWER | ANALYST | CONTROLLER | ADMIN |
|------|--------|---------|------------|-------|
| Ver Central de Migracao | ❌ | ✅ | ✅ | ✅ |
| Baixar templates | ❌ | ✅ | ✅ | ✅ |
| Criar novo lote | ❌ | ✅ | ✅ | ✅ |
| Upload de arquivo | ❌ | ✅ | ✅ | ✅ |
| Mapear colunas | ❌ | ✅ | ✅ | ✅ |
| Revisar e corrigir | ❌ | ✅ | ✅ | ✅ |
| **Aprovar gravacao** | ❌ | ❌ | ✅ | ✅ |
| **Executar gravacao** | ❌ | ❌ | ✅ | ✅ |
| **Desfazer/Rollback** | ❌ | ❌ | ❌ | ✅ |
| Exportar dados | ❌ | ✅ | ✅ | ✅ |
| Configurar presets ERP | ❌ | ❌ | ✅ | ✅ |
| Ver historico | ❌ | ✅ | ✅ | ✅ |

### 10.2 Trilha de Auditoria

Cada lote gera registros no `AuditLog` existente:

```
tableName: "MigrationBatch"
action: CREATE / UPDATE
newValues: { status: "UPLOADED" → "VALIDATED" → "APPROVED" → "COMPLETED" }
userId, userEmail, ipAddress, timestamp
```

Alem disso, cada `MigrationItem` tem:
- `rawData` (dado original)
- `mappedData` (dado mapeado)
- `correctedData` (dado corrigido pelo usuario, se houver)
- `resultId` (ID do registro criado)

Isso permite rastrear: **arquivo original → linha original → transformacao → registro final**.

### 10.3 Protecoes

| Risco | Protecao |
|-------|----------|
| Sobrescrita indevida | `_action` explicito (CREATE/UPDATE), default CREATE |
| Duplicacao | Chave de deduplicacao por entidade, verificacao intra-lote e inter-base |
| Contaminacao entre tenants | RLS enforced, tenantId em todos os registros, verificacao no batch |
| Importacao em periodo fechado | Verificacao contra PeriodLock antes da gravacao |
| Arquivo corrompido | Validacao de formato + hash SHA-256 |
| Volume excessivo | Limite de 50MB por arquivo, 100k linhas por lote |
| Gravacao parcial | Transacao por entidade, rollback atomico |
| Rollback inseguro | Rollback so por ADMIN, com confirmacao, salva dados antes |

### 10.4 Rollback

O rollback funciona por entidade, na ordem inversa da importacao:

```
1. Deleta Conciliacoes criadas pelo lote
2. Deleta Transferencias criadas
3. Deleta Baixas/Settlements criadas
4. Deleta Lancamentos Oficiais criados
5. Deleta Lancamentos Staging criados
6. Restaura saldos bancarios ao valor anterior
7. Deleta Regras criadas
8. Deleta Cadastros criados (se nao referenciados por outros registros)
```

Limitacao: nao e possivel desfazer se outros registros (fora do lote) ja referenciam os dados importados. Nesse caso, o sistema avisa e impede o rollback.

---

## 11. EXPORTACAO COMPLETA

### 11.1 Modos de Exportacao

| Modo | Descricao | Formato |
|------|-----------|---------|
| Full Backup | Todas as entidades, todos os registros | XLSX multi-aba |
| Por Modulo | Apenas entidades selecionadas | XLSX |
| Por Periodo | Lancamentos e operacoes de um intervalo | XLSX |
| Para Auditoria | Com metadados, logs, timestamps | XLSX com abas extras |
| Reimportavel | Com IDs internos + externos, pronto para reimportar | XLSX template |
| Para Conferencia | Resumido, com totalizadores | XLSX |

### 11.2 Estrutura do XLSX Exportado

Mesmas abas do template de importacao + abas adicionais:

```
Aba extra: _METADADOS
  - Data da exportacao
  - Tenant exportado
  - Usuario que exportou
  - Versao do sistema
  - Filtros aplicados
  - Contadores por entidade

Aba extra: _IDS
  - Tabela de IDs internos para cada registro
  - Permite reimportacao com atualizacao precisa

Aba extra: _AUDITORIA (se modo auditoria)
  - Log de criacao/alteracao de cada registro
  - Usuario, data, IP
```

### 11.3 Exportacao Reimportavel

A exportacao reimportavel inclui na coluna `_action` o valor `UPDATE` para todos os registros e preenche o `external_id` com o ID interno do sistema. Isso permite:

1. Exportar → editar no Excel → reimportar como atualizacao
2. Exportar → enviar para outro tenant → importar como carga inicial (trocando IDs)

### 11.4 Exportacao com Relacionamentos Preservados

As chaves estrangeiras sao exportadas como **chaves naturais** (code, cnpj_cpf, etc.), nao IDs internos. Isso permite que o Excel seja legivel e importavel em outro tenant sem dependencia de IDs.

---

## 12. MELHOR MODELO TECNICO

### 12.1 Arquitetura

```
[Frontend Next.js]
     │
     ├── Upload: FormData → Server Action
     │     └── Salva arquivo em /tmp ou storage temporario
     │
     ├── Parsing: Server Action (sincrono para < 5k linhas, async para > 5k)
     │     └── ExcelJS para XLSX, papaparse para CSV
     │     └── Cria MigrationBatch + MigrationItems
     │
     ├── Validacao: Server Action (async para lotes grandes)
     │     └── Processa em chunks de 500 linhas
     │     └── Cria MigrationErrors
     │     └── Atualiza contadores no batch
     │
     ├── Gravacao: Server Action (async, sempre)
     │     └── Transacao por entidade (nivel)
     │     └── Prisma.$transaction com timeout adequado
     │     └── Salva rollbackData
     │
     └── Exportacao: Server Action
           └── ExcelJS para gerar XLSX
           └── Stream para download
```

### 12.2 Parsing de Excel

**Biblioteca**: `exceljs` (ja usado no projeto para templates)

Fluxo de parsing:
1. Detectar abas presentes
2. Para cada aba: ler cabecalho (linha 1), tipo (linha 3)
3. Para cada linha de dados: criar `MigrationItem` com `rawData` = JSON da linha
4. Aplicar mapeamento: gerar `mappedData` com nomes de campo internos
5. Detectar formato de data/moeda automaticamente nas primeiras 10 linhas

### 12.3 Processamento em Lotes

Para lotes grandes (>5k linhas):

```typescript
// Processamento em chunks
const CHUNK_SIZE = 500;
const chunks = splitIntoChunks(items, CHUNK_SIZE);

for (const chunk of chunks) {
  await prisma.$transaction(async (tx) => {
    for (const item of chunk) {
      // validar / importar
    }
  }, { timeout: 30000 });

  // Atualizar progresso
  await updateBatchProgress(batchId, processedCount);
}
```

### 12.4 Performance

| Volume | Estrategia | Tempo estimado |
|--------|-----------|----------------|
| < 1k linhas | Sincrono, uma transacao | < 5s |
| 1k-10k linhas | Chunks de 500, async | 10-60s |
| 10k-50k linhas | Chunks de 500, async, progress bar | 1-5min |
| > 50k linhas | Dividir em multiplos lotes | Recomendacao ao usuario |

### 12.5 Limites

| Parametro | Limite | Justificativa |
|-----------|--------|---------------|
| Tamanho arquivo | 50 MB | Memoria do serverless |
| Linhas por lote | 100.000 | Performance e UX |
| Abas por XLSX | 20 | Schema definido |
| Lotes simultaneos | 1 por tenant | Evitar conflito |
| Timeout transacao | 30s por chunk | Neon connection limits |

---

## 13. REGRAS DE NEGOCIO CRITICAS

### 13.1 Hierarquia de Datas

| Data | Campo | Significado | Obrigatoria | Regra de importacao |
|------|-------|------------|-------------|-------------------|
| **date** | `date` | Data da transacao (fato gerador) | **Sim** | Sempre obrigatoria |
| **competenceDate** | `competenceDate` | Data de competencia contabil (regime competencia) | **Sim no oficial** | Se vazia na importacao, usa `date` |
| **dueDate** | `dueDate` | Data de vencimento | Nao | Obrigatoria para PAYABLE/RECEIVABLE |
| **paidDate** | `paidDate` | Data efetiva do pagamento | Nao | Preenchida na baixa |
| **bankPostedDate** | `bankPostedDate` | Data que o banco registrou | Nao | Usada em conciliacao |
| **settlementDate** | `settlementDate` | Data contabil da liquidacao | Nao | Se vazia, usa data da baixa |

### 13.2 Staging vs Official

| Aspecto | Staging | Official |
|---------|---------|----------|
| Proposito | Area de validacao, pode ser editado livremente | Registro contabil definitivo |
| Criacao | Importacao ou manual | Incorporacao do staging ou importacao direta |
| Edicao | Livre nos estados PENDING/PARSED/NORMALIZED/AUTO_CLASSIFIED/CONFLICT | Restrita, imutavel apos incorporacao (RA07) |
| Campos obrigatorios | date, description, amount, type | + competenceDate, chartOfAccountId, bankAccountId |
| Na importacao | Aba `lancamentos_staging` → cria StagingEntry | Aba `lancamentos_oficiais` → cria OfficialEntry diretamente |
| Fluxo recomendado | Importar como staging → validar → incorporar | Importar direto como oficial (para migracao de ERP, dados ja validados) |

### 13.3 Derivacao de Category

**Problema atual**: `category` e derivada implicitamente em alguns pontos mas nao ha regra clara e consistente.

**Regra correta para importacao**:

```
Se category informada na planilha → usar a informada
Se nao informada:
  Se type = DEBIT → category = PAYABLE (padrao)
  Se type = CREDIT → category = RECEIVABLE (padrao)

  Excecoes (detectadas automaticamente):
  - Se movement_type = TRANSFER → category = TRANSFER
  - Se movement_type = ADJUSTMENT → category = ADJUSTMENT
  - Se existe transferencia interna referenciando → category = TRANSFER
```

### 13.4 Transferencias na Importacao

Transferencia interna gera 2 lancamentos (debito na origem, credito no destino) + 1 `InternalTransfer`. Na importacao:

- Se o usuario importa pela aba `transferencias`: o sistema cria automaticamente os 2 lancamentos + a InternalTransfer
- Se o usuario importa lancamentos de transferencia manualmente: deve marcar `movement_type = TRANSFER` e `category = TRANSFER`. O sistema nao cria InternalTransfer automaticamente (aviso W)

### 13.5 Parcelamentos na Importacao

Parcelas sao lancamentos oficiais agrupados por `installment_group`. Na importacao:

- Se `installment_number` e `total_installments` e `installment_group` estao preenchidos: o sistema agrupa automaticamente
- O `installment_group` e um identificador do ERP de origem (texto livre)
- Se faltar algum campo de parcela: warning W, importa como lancamento individual

### 13.6 Baixas Parciais

- Um lancamento pode ter multiplas baixas ate completar o valor total
- Na importacao: cada linha da aba `baixas` e uma baixa individual
- Se a soma das baixas > valor do lancamento: erro E012
- Se a soma das baixas = valor: status vira SETTLED automaticamente
- Se a soma das baixas < valor: status vira PARTIAL

### 13.7 Periodos Fechados

Se o tenant tem `PeriodLock` para um periodo (mes/ano), nenhum lancamento com `competenceDate` naquele periodo pode ser importado. Erro E013.

### 13.8 Reimportacao

- Se o lote ja foi importado e o usuario quer reimportar (correcoes):
  1. Criar novo lote tipo REIMPORT referenciando o lote original
  2. Na validacao, detectar registros que ja existem (por external_id)
  3. Marcar como `_action = UPDATE` automaticamente
  4. Mostrar diff do que vai mudar
  5. Na gravacao, atualizar registros existentes (respeitando imutabilidade RA07)

---

## 14. MELHORIAS NO SISTEMA ATUAL

### 14.1 Campos Faltantes no StagingEntry

**CRITICO**: O model `StagingEntry` atual NAO possui:

| Campo | Status | Impacto |
|-------|--------|---------|
| `dueDate` | **FALTANDO** | Impossivel importar vencimento via staging |
| `competenceDate` | **FALTANDO** | Impossivel importar competencia via staging |
| `originalDueDate` | **FALTANDO** | Sem historico de vencimento original |
| `category` | **FALTANDO** | Derivacao implicita, nao explicita |
| `documentNumber` | **FALTANDO** | Sem referencia a numero de documento |
| `externalId` | **FALTANDO** | Sem rastreabilidade ao ERP de origem |
| `migrationBatchId` | **FALTANDO** | Sem vinculo ao lote de migracao |
| `migrationItemId` | **FALTANDO** | Sem vinculo ao item de migracao |

**Acao**: Adicionar esses campos ao `StagingEntry` no schema.prisma.

### 14.2 Derivacao de Category

**Problema**: Em varios pontos do codigo, `category` e derivada de forma inconsistente:
- Na incorporacao, o staging nao tem `category` — entao o OfficialEntry recebe o que?
- Na importacao de extrato bancario, DEBIT vira o que?

**Correcao**:
1. Adicionar `category` ao `StagingEntry` (enum `EntryCategory`)
2. Na importacao, derivar category se nao informada (regra da secao 13.3)
3. Na incorporacao, copiar `category` do staging para o official
4. Nunca deixar `category` nulo no OfficialEntry

### 14.3 Relacionamento staging → official → settlement → reconciliation

**Problema**: Nao ha campo `externalId` em nenhum dos models financeiros. Para migracao de ERP, precisamos rastrear qual registro no sistema antigo corresponde a qual registro no novo.

**Correcao**:
1. Adicionar `externalId String?` em: StagingEntry, OfficialEntry, Settlement, Reconciliation
2. Adicionar `migrationBatchId String?` nos mesmos
3. Criar index em `(tenantId, externalId)` para busca rapida

### 14.4 Rollback e Reversao

**Problema**: Hoje nao existe mecanismo de rollback para lancamentos importados.

**Correcao**: O modelo `MigrationBatch.rollbackData` (Json) armazena os IDs de todos os registros criados, organizados por entidade. O rollback deleta na ordem inversa em uma transacao.

### 14.5 Importacao em massa por entidade

**Problema**: O `import.ts` atual so importa tipos especificos (extrato, NF, cartao). Nao ha funcao generica para importar cadastros base em massa.

**Correcao**: Criar novo service `src/lib/services/migration.ts` que:
1. Processa qualquer `MigrationEntityType`
2. Resolve dependencias entre entidades
3. Grava transacionalmente por nivel
4. Gera rollbackData

---

## 15. SAIDA FINAL

### A. Blueprint Completo

Este documento E o blueprint completo. Cobertura: 18 entidades importaveis, 4 novos models Prisma, 48 regras de validacao, wizard de 7 etapas, 6 modos de exportacao, presets para 7 ERPs, rollback transacional, trilha de auditoria completa.

### B. Fluxo Ideal Ponta a Ponta

```
1. Usuario acessa Central de Migracao
2. Seleciona tipo (carga inicial / modulo / atualizacao)
3. Opcionalmente seleciona ERP de origem (carrega preset)
4. Faz upload do arquivo (XLSX/ZIP/CSV)
5. Sistema detecta abas/entidades e propoe mapeamento
6. Usuario confirma/ajusta mapeamento
7. Sistema valida em massa (48 regras)
8. Usuario revisa erros e warnings
9. Usuario corrige inline ou aplica sugestoes
10. Re-valida ate score aceitavel
11. Controller/Admin aprova com checklist
12. Sistema grava transacionalmente, por entidade, na ordem correta
13. Relatorio final com contadores
14. Lote fica no historico com opcao de rollback
```

### C. Estrutura da Pagina Lateral

```
/migration/overview    → Cards resumo + ultimos lotes
/migration/templates   → Download de templates
/migration/new         → Wizard 7 etapas
/migration/batches/[id]  → Detalhe do lote
/migration/export      → Central de exportacao
/migration/erp-mapping → Presets de ERP
/migration/history     → Historico completo
```

### D. Modelo de Dados

4 novos models:
- `MigrationBatch` — lote de importacao/exportacao
- `MigrationItem` — cada linha do arquivo
- `MigrationError` — cada erro/warning encontrado
- `MigrationEntitySummary` — totais por entidade no lote
- `MigrationMapping` — presets de mapeamento salvos

8 campos novos no StagingEntry + 2 no OfficialEntry.

### E. Ordem de Importacao

```
Nivel 0: Plano de contas, Centros de custo, Formas de pagamento, Produtos, Depositos
Nivel 1: Fornecedores, Clientes, Contas bancarias
Nivel 2: Regras de classificacao, Regras de validacao, Saldos iniciais
Nivel 3: Lancamentos staging, Lancamentos oficiais
Nivel 4: Baixas/Liquidacoes, Parcelas, Transferencias
Nivel 5: Conciliacoes
Nivel 6: Recorrencias
```

### F. Regras de Validacao

48 regras: 22 bloqueantes (E001-E022), 16 warnings (W001-W016), 6 sugestoes (I001-I006) + score de confianca 0-100 por linha.

### G. Estrutura dos Templates

Template mestre com 20 abas (2 instrucao + 18 dados). Cada aba: 4 linhas de cabecalho (nome, campo tecnico, tipo, exemplo) + dados. Chaves estrangeiras por chave natural (code, cnpj_cpf, name).

### H. Especificacao UX/UI

7 telas principais: Overview, Templates, Wizard (7 etapas), Revisao, Aprovacao, Historico, Exportacao. Drag & drop, edicao inline, acoes em massa, progress bar em tempo real.

### I. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Volume excessivo trava sistema | Media | Alto | Chunks de 500, timeout por chunk, limite 100k |
| Dados sujos contaminam base | Alta | Critico | Staging + 48 validacoes + aprovacao obrigatoria |
| Rollback incompleto | Baixa | Alto | Transacao atomica por entidade, verificacao de referencias |
| Periodo fechado ignorado | Media | Alto | Verificacao contra PeriodLock na validacao |
| Mapeamento errado nao detectado | Media | Alto | Preview obrigatorio, score de confianca, checklist |
| Timeout em lotes grandes | Media | Medio | Processamento async, chunks, progress bar |
| Sobrescrita de dados existentes | Media | Critico | _action explicito, confirmacao visual de UPDATEs |

### J. Roadmap de Implementacao em Fases

**Fase 1 — Foundation (2 semanas)**
- Schema: 4 novos models + campos no StagingEntry/OfficialEntry
- RLS policies para novos models
- Service basico de migracao (parsing, validacao, gravacao)
- Templates Excel (gerar com ExcelJS)

**Fase 2 — Core Import (2 semanas)**
- Wizard completo (7 etapas)
- Mapeamento de colunas com auto-deteccao
- Validacao em massa (48 regras)
- Revisao e correcao inline
- Aprovacao com checklist

**Fase 3 — Export + History (1 semana)**
- Exportacao full backup
- Exportacao por modulo/periodo
- Historico de lotes
- Download do arquivo original

**Fase 4 — Advanced (2 semanas)**
- Rollback transacional
- Presets por ERP (Omie, Dominio, Totvs)
- Score de confianca
- Deduplicacao inteligente
- Processamento async para lotes grandes

**Fase 5 — Polish (1 semana)**
- UX refinement
- Drag & drop
- Salvar mapeamentos favoritos
- Testes de carga
- Documentacao

**Total estimado: 8 semanas**

### K. Lista de Prompts para Proximos Passos

Copie e use estes prompts para pedir cada parte da implementacao:

```
1. SCHEMA:
"Implemente no schema.prisma os 4 novos models (MigrationBatch, MigrationItem, MigrationError, MigrationEntitySummary, MigrationMapping) e os campos novos no StagingEntry e OfficialEntry, conforme o blueprint da Central de Migracao. Adicione RLS policies. Execute prisma db push."

2. TEMPLATES EXCEL:
"Crie o service src/lib/services/migration-templates.ts que gera os templates Excel com ExcelJS, incluindo: template mestre com 20 abas, templates individuais por entidade, cabecalhos de 4 linhas, validacoes Excel, exemplos preenchidos e dicionario de dados."

3. SERVICE DE MIGRACAO:
"Crie o service src/lib/services/migration.ts com as funcoes: parseMigrationFile (detecta formato, extrai dados), validateMigrationBatch (48 regras), importMigrationBatch (gravacao transacional por nivel), rollbackMigrationBatch, e exportData."

4. SERVER ACTIONS:
"Crie o arquivo src/lib/actions/migration.ts com as server actions: createMigrationBatch, uploadMigrationFile, mapColumns, validateBatch, reviewAndCorrect, approveBatch, processBatch, rollbackBatch, listBatches, getBatchDetail, exportData, downloadTemplate."

5. PAGINA OVERVIEW:
"Crie as paginas src/app/(app)/migration/overview/page.tsx e client.tsx com: cards resumo (total lotes, em andamento, pendentes aprovacao, concluidos), lista dos ultimos lotes, botoes para nova importacao e exportacao."

6. WIZARD DE IMPORTACAO:
"Crie as paginas src/app/(app)/migration/new/page.tsx e client.tsx com o wizard de 7 etapas: selecao de tipo, upload com drag & drop, mapeamento de colunas com auto-deteccao, validacao com progress bar, revisao com edicao inline, aprovacao com checklist, gravacao com progresso."

7. PAGINA DE REVISAO:
"Crie as paginas src/app/(app)/migration/batches/[id]/review/page.tsx e client.tsx com: lista de erros e warnings filtravelis por entidade e criticidade, edicao inline, acoes em massa, aplicar sugestoes automaticas, re-validacao."

8. PAGINA DE EXPORTACAO:
"Crie as paginas src/app/(app)/migration/export/page.tsx e client.tsx com: seletores de modo (full backup, por modulo, por periodo, reimportavel, auditoria), seletor de entidades, filtros de data, botao de download."

9. PRESETS DE ERP:
"Crie o service src/lib/services/erp-presets.ts com presets de mapeamento para Omie, Dominio e Totvs. Inclua: mapeamento de colunas, transformacao de valores (de/para de categorias, status, tipos), formatos de data e moeda."

10. VALIDACOES COMPLETAS:
"Implemente as 48 regras de validacao do blueprint no service de migracao: 22 erros bloqueantes (E001-E022), 16 warnings (W001-W016), 6 sugestoes (I001-I006). Inclua score de confianca por linha."

11. NAVIGATION:
"Atualize src/lib/constants/navigation.ts para adicionar o grupo 'Migracao' com as rotas: Visao Geral, Templates, Nova Importacao, Exportar, Mapeamento ERP, Historico."

12. TESTES:
"Crie testes para o service de migracao cobrindo: parsing de XLSX multi-aba, validacao de todas as 48 regras, importacao transacional com rollback, deteccao de duplicatas, resolucao de dependencias entre entidades."
```

---

## FIM DO BLUEPRINT

Este documento serve como especificacao completa para implementacao da Central de Migracao e Importacao. Cada secao foi projetada para ser implementavel de forma independente, seguindo o roadmap de fases proposto.

A prioridade absoluta antes de comecar a implementacao e: **corrigir os campos faltantes no StagingEntry** (secao 14.1), pois sem isso toda a importacao via staging entra incompleta.
