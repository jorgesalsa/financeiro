export type TemplateAccount = {
  code: string;
  name: string;
  type: "REVENUE" | "DEDUCTION" | "COST" | "EXPENSE" | "INVESTMENT";
  level: number;
  isAnalytic: boolean;
  parentCode?: string;
};

export type ChartTemplate = {
  id: string;
  name: string;
  description: string;
  accounts: TemplateAccount[];
};

// ---------------------------------------------------------------------------
// Shared sections used across all financial/gerencial templates (1-4)
// Sections: 2 (Deduções/Impostos), 4.01-4.06 (Despesas Operacionais), 5 (Investimentos)
// ---------------------------------------------------------------------------

const SHARED_DEDUCOES: TemplateAccount[] = [
  { code: "2", name: "DEDUÇÕES E IMPOSTOS SOBRE VENDAS", type: "DEDUCTION", level: 1, isAnalytic: false },
  { code: "2.01", name: "Impostos sobre Vendas", type: "DEDUCTION", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.01.01", name: "Simples Nacional / DAS", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.02", name: "ICMS sobre Vendas", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.03", name: "ISS sobre Serviços", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.04", name: "PIS sobre Faturamento", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.05", name: "COFINS sobre Faturamento", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.06", name: "IPI", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.02", name: "Devoluções e Abatimentos", type: "DEDUCTION", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.02.01", name: "Devoluções de Vendas", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.02" },
  { code: "2.02.02", name: "Abatimentos Concedidos", type: "DEDUCTION", level: 3, isAnalytic: true, parentCode: "2.02" },
];

const SHARED_DESPESAS_OPERACIONAIS_BASE: TemplateAccount[] = [
  { code: "4", name: "DESPESAS OPERACIONAIS", type: "EXPENSE", level: 1, isAnalytic: false },
  // 4.01 Despesas com Pessoal
  { code: "4.01", name: "Despesas com Pessoal", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.01.01", name: "Salários e Ordenados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.02", name: "13º Salário", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.03", name: "Férias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.04", name: "FGTS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.05", name: "INSS Patronal", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.06", name: "Vale Transporte", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.07", name: "Vale Refeição / Alimentação", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.08", name: "Plano de Saúde", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.09", name: "Outros Benefícios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  // 4.02 Despesas Administrativas
  { code: "4.02", name: "Despesas Administrativas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.02.01", name: "Aluguel", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.02", name: "Condomínio e IPTU", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.03", name: "Energia Elétrica", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.04", name: "Água e Esgoto", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.05", name: "Telefone e Internet", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.06", name: "Material de Escritório", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.07", name: "Material de Limpeza", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.08", name: "Manutenção e Reparos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.09", name: "Seguros", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.10", name: "Contabilidade e Assessoria", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.11", name: "Serviços de TI", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.12", name: "Assinaturas e Licenças", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  // 4.03 Despesas Comerciais
  { code: "4.03", name: "Despesas Comerciais", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.03.01", name: "Marketing e Publicidade", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.02", name: "Comissões sobre Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.03", name: "Frete sobre Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.04", name: "Brindes e Amostras", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.05", name: "Viagens Comerciais", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  // 4.04 Despesas Financeiras
  { code: "4.04", name: "Despesas Financeiras", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.04.01", name: "Juros Pagos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.02", name: "Tarifas Bancárias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.03", name: "IOF", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.04", name: "Multas e Juros por Atraso", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.05", name: "Taxas de Cartão de Crédito/Débito", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.06", name: "Taxas de Boleto", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.07", name: "Taxas de Pix", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  // 4.05 Despesas com Veiculos
  { code: "4.05", name: "Despesas com Veículos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.05.01", name: "Combustível", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.02", name: "Manutenção de Veículos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.03", name: "Seguro de Veículos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.04", name: "IPVA e Licenciamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.05", name: "Pedágios e Estacionamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  // 4.06 Impostos e Tributos
  { code: "4.06", name: "Impostos e Tributos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.06.01", name: "IRPJ", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
  { code: "4.06.02", name: "CSLL", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
  { code: "4.06.03", name: "Outras Taxas e Contribuições", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
];

const SHARED_INVESTIMENTOS_RETIRADAS: TemplateAccount[] = [
  { code: "5", name: "INVESTIMENTOS E RETIRADAS", type: "INVESTMENT", level: 1, isAnalytic: false },
  { code: "5.01", name: "Investimentos (CAPEX)", type: "INVESTMENT", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.01.01", name: "Equipamentos", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.02", name: "Móveis e Utensílios", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.03", name: "Tecnologia (Software/Hardware)", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.04", name: "Reformas e Melhorias", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.02", name: "Retiradas e Distribuições", type: "INVESTMENT", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.02.01", name: "Pró-labore", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.02", name: "Distribuição de Lucros", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.03", name: "Empréstimos a Sócios", type: "INVESTMENT", level: 3, isAnalytic: true, parentCode: "5.02" },
];

// ---------------------------------------------------------------------------
// Shared "Outras Receitas" subgroup (1.02) - same across all financial templates
// ---------------------------------------------------------------------------

const SHARED_OUTRAS_RECEITAS: TemplateAccount[] = [
  { code: "1.02", name: "Outras Receitas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.02.01", name: "Receitas Financeiras", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.02", name: "Rendimentos de Aplicações", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.03", name: "Receita de Aluguéis", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.04", name: "Receita de Comissões", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.05", name: "Recuperação de Despesas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.06", name: "Descontos Obtidos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
];

// ===========================================================================
// 1. FINANCEIRO GERAL
// ===========================================================================

const financeiroGeralAccounts: TemplateAccount[] = [
  // --- 1 RECEITAS ---
  { code: "1", name: "RECEITAS", type: "REVENUE", level: 1, isAnalytic: false },
  { code: "1.01", name: "Receita de Vendas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.01.01", name: "Venda de Mercadorias", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Venda de Produtos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Venda de Serviços", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "COST", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custo das Mercadorias Vendidas", type: "COST", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Mercadorias", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Compra de Matéria-Prima", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Frete sobre Compras", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Embalagens", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,

  // --- 5 INVESTIMENTOS E RETIRADAS ---
  ...SHARED_INVESTIMENTOS_RETIRADAS,
];

// ===========================================================================
// 2. ALIMENTOS E BEBIDAS
// ===========================================================================

const alimentosBebidasAccounts: TemplateAccount[] = [
  // --- 1 RECEITAS ---
  { code: "1", name: "RECEITAS", type: "REVENUE", level: 1, isAnalytic: false },
  { code: "1.01", name: "Receita de Vendas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.01.01", name: "Vendas no Salão", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Vendas Delivery", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Vendas Balcão/Take Away", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Eventos e Catering", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Venda de Bebidas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Couvert e Taxas de Serviço", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "COST", level: 1, isAnalytic: false },
  { code: "3.01", name: "CMV Alimentos e Bebidas", type: "COST", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Alimentos", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Compra de Bebidas", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Compra de Descartáveis", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Insumos de Cozinha", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.05", name: "Gás de Cozinha", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.06", name: "Embalagens para Delivery", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Operacionais Especificas (setor)
  { code: "4.07", name: "Despesas Operacionais Específicas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Uniformes", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Lavanderia", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Dedetização e Controle de Pragas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Licenças Sanitárias (Vigilância/Alvará)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Taxas de Marketplace/iFood", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.06", name: "Música e Entretenimento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.07", name: "Descartáveis e Utensílios de Mesa", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },

  // --- 5 INVESTIMENTOS E RETIRADAS ---
  ...SHARED_INVESTIMENTOS_RETIRADAS,
];

// ===========================================================================
// 3. PRESTACAO DE SERVICOS
// ===========================================================================

const servicosAccounts: TemplateAccount[] = [
  // --- 1 RECEITAS ---
  { code: "1", name: "RECEITAS", type: "REVENUE", level: 1, isAnalytic: false },
  { code: "1.01", name: "Receita de Vendas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.01.01", name: "Receita de Projetos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Receita de Consultoria", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Receita de Mensalidades/Assinaturas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Receita de Horas Técnicas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Receita de Treinamentos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Receita de Licenciamento", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "COST", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custos de Serviços Prestados", type: "COST", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Subcontratação de Serviços", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Mão de Obra Terceirizada", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Materiais Aplicados", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Despesas Diretas de Projeto", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Especificas de Servicos
  { code: "4.07", name: "Despesas Específicas de Serviços", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Software e Ferramentas SaaS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Treinamentos e Capacitação", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Viagens e Hospedagem", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Certificações e Licenças Profissionais", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Coworking e Espaços Compartilhados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.06", name: "Seguro de Responsabilidade Civil", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },

  // --- 5 INVESTIMENTOS E RETIRADAS ---
  ...SHARED_INVESTIMENTOS_RETIRADAS,
];

// ===========================================================================
// 4. COMERCIO
// ===========================================================================

const comercioAccounts: TemplateAccount[] = [
  // --- 1 RECEITAS ---
  { code: "1", name: "RECEITAS", type: "REVENUE", level: 1, isAnalytic: false },
  { code: "1.01", name: "Receita de Vendas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.01.01", name: "Vendas no Varejo (Loja Física)", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Vendas no Atacado", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Vendas Online / E-commerce", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Vendas Marketplace", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Vendas por Representantes", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Receita de Frete Cobrado", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "COST", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custo das Mercadorias Vendidas", type: "COST", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Mercadorias para Revenda", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Frete sobre Compras", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Seguro sobre Compras", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Embalagens", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.05", name: "Diferenças de Inventário", type: "COST", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Especificas de Comercio
  { code: "4.07", name: "Despesas Específicas de Comércio", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Taxas de Marketplace (iFood/Mercado Livre/etc)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Frete sobre Vendas / Envios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Embalagens para Envio", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Devoluções e Trocas (logística reversa)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Antecipação de Recebíveis", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.06", name: "Perdas e Quebras de Estoque", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.07", name: "Seguro de Mercadorias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },

  // --- 5 INVESTIMENTOS E RETIRADAS ---
  ...SHARED_INVESTIMENTOS_RETIRADAS,
];

// ===========================================================================
// CHART_TEMPLATES - main export (only financial/gerencial templates)
// ===========================================================================

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: "financeiro_geral",
    name: "Financeiro Geral",
    description:
      "Plano de contas financeiro/gerencial. Ideal para controle de receitas e despesas do dia a dia.",
    accounts: financeiroGeralAccounts,
  },
  {
    id: "alimentos_bebidas",
    name: "Alimentos e Bebidas",
    description:
      "Para restaurantes, bares, lanchonetes, food service e delivery.",
    accounts: alimentosBebidasAccounts,
  },
  {
    id: "servicos",
    name: "Prestação de Serviços",
    description:
      "Para consultorias, agências, escritórios, TI e profissionais liberais.",
    accounts: servicosAccounts,
  },
  {
    id: "comercio",
    name: "Comércio",
    description: "Para varejo, atacado, e-commerce e lojas.",
    accounts: comercioAccounts,
  },
];

// ===========================================================================
// Helper
// ===========================================================================

export function getTemplate(id: string): ChartTemplate | undefined {
  return CHART_TEMPLATES.find((t) => t.id === id);
}
