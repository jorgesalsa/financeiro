export type TemplateAccount = {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
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
// Sections: 2 (Impostos), 4.01-4.06 (Despesas Operacionais), 5 (Investimentos)
// ---------------------------------------------------------------------------

const SHARED_DEDUCOES: TemplateAccount[] = [
  { code: "2", name: "DEDU\u00c7\u00d5ES E IMPOSTOS SOBRE VENDAS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "2.01", name: "Impostos sobre Vendas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.01.01", name: "Simples Nacional / DAS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.02", name: "ICMS sobre Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.03", name: "ISS sobre Servi\u00e7os", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.04", name: "PIS sobre Faturamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.05", name: "COFINS sobre Faturamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.06", name: "IPI", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.02", name: "Devolu\u00e7\u00f5es e Abatimentos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.02.01", name: "Devolu\u00e7\u00f5es de Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.02" },
  { code: "2.02.02", name: "Abatimentos Concedidos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "2.02" },
];

const SHARED_DESPESAS_OPERACIONAIS_BASE: TemplateAccount[] = [
  { code: "4", name: "DESPESAS OPERACIONAIS", type: "EXPENSE", level: 1, isAnalytic: false },
  // 4.01 Despesas com Pessoal
  { code: "4.01", name: "Despesas com Pessoal", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.01.01", name: "Sal\u00e1rios e Ordenados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.02", name: "13\u00ba Sal\u00e1rio", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.03", name: "F\u00e9rias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.04", name: "FGTS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.05", name: "INSS Patronal", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.06", name: "Vale Transporte", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.07", name: "Vale Refei\u00e7\u00e3o / Alimenta\u00e7\u00e3o", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.08", name: "Plano de Sa\u00fade", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.09", name: "Outros Benef\u00edcios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.01" },
  // 4.02 Despesas Administrativas
  { code: "4.02", name: "Despesas Administrativas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.02.01", name: "Aluguel", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.02", name: "Condom\u00ednio e IPTU", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.03", name: "Energia El\u00e9trica", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.04", name: "\u00c1gua e Esgoto", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.05", name: "Telefone e Internet", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.06", name: "Material de Escrit\u00f3rio", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.07", name: "Material de Limpeza", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.08", name: "Manuten\u00e7\u00e3o e Reparos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.09", name: "Seguros", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.10", name: "Contabilidade e Assessoria", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.11", name: "Servi\u00e7os de TI", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.12", name: "Assinaturas e Licen\u00e7as", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.02" },
  // 4.03 Despesas Comerciais
  { code: "4.03", name: "Despesas Comerciais", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.03.01", name: "Marketing e Publicidade", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.02", name: "Comiss\u00f5es sobre Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.03", name: "Frete sobre Vendas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.04", name: "Brindes e Amostras", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.05", name: "Viagens Comerciais", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.03" },
  // 4.04 Despesas Financeiras
  { code: "4.04", name: "Despesas Financeiras", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.04.01", name: "Juros Pagos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.02", name: "Tarifas Banc\u00e1rias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.03", name: "IOF", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.04", name: "Multas e Juros por Atraso", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.05", name: "Taxas de Cart\u00e3o de Cr\u00e9dito/D\u00e9bito", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.06", name: "Taxas de Boleto", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  { code: "4.04.07", name: "Taxas de Pix", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.04" },
  // 4.05 Despesas com Veiculos
  { code: "4.05", name: "Despesas com Ve\u00edculos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.05.01", name: "Combust\u00edvel", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.02", name: "Manuten\u00e7\u00e3o de Ve\u00edculos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.03", name: "Seguro de Ve\u00edculos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.04", name: "IPVA e Licenciamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  { code: "4.05.05", name: "Ped\u00e1gios e Estacionamento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.05" },
  // 4.06 Impostos e Tributos
  { code: "4.06", name: "Impostos e Tributos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.06.01", name: "IRPJ", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
  { code: "4.06.02", name: "CSLL", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
  { code: "4.06.03", name: "Outras Taxas e Contribui\u00e7\u00f5es", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.06" },
];

const SHARED_INVESTIMENTOS_RETIRADAS: TemplateAccount[] = [
  { code: "5", name: "INVESTIMENTOS E RETIRADAS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "5.01", name: "Investimentos (CAPEX)", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.01.01", name: "Equipamentos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.02", name: "M\u00f3veis e Utens\u00edlios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.03", name: "Tecnologia (Software/Hardware)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.04", name: "Reformas e Melhorias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.02", name: "Retiradas e Distribui\u00e7\u00f5es", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.02.01", name: "Pr\u00f3-labore", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.02", name: "Distribui\u00e7\u00e3o de Lucros", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.03", name: "Empr\u00e9stimos a S\u00f3cios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
];

// ---------------------------------------------------------------------------
// Shared "Outras Receitas" subgroup (1.02) - same across all financial templates
// ---------------------------------------------------------------------------

const SHARED_OUTRAS_RECEITAS: TemplateAccount[] = [
  { code: "1.02", name: "Outras Receitas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.02.01", name: "Receitas Financeiras", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.02", name: "Rendimentos de Aplica\u00e7\u00f5es", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.03", name: "Receita de Alugu\u00e9is", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.04", name: "Receita de Comiss\u00f5es", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.05", name: "Recupera\u00e7\u00e3o de Despesas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.02" },
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
  { code: "1.01.03", name: "Venda de Servi\u00e7os", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custo das Mercadorias Vendidas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Mercadorias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Compra de Mat\u00e9ria-Prima", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Frete sobre Compras", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Embalagens", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },

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
  { code: "1.01.01", name: "Vendas no Sal\u00e3o", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Vendas Delivery", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Vendas Balc\u00e3o/Take Away", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Eventos e Catering", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Venda de Bebidas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Couvert e Taxas de Servi\u00e7o", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "3.01", name: "CMV Alimentos e Bebidas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Alimentos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Compra de Bebidas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Compra de Descart\u00e1veis", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Insumos de Cozinha", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.05", name: "G\u00e1s de Cozinha", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.06", name: "Embalagens para Delivery", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Operacionais Especificas (setor)
  { code: "4.07", name: "Despesas Operacionais Espec\u00edficas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Uniformes", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Lavanderia", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Dedetiza\u00e7\u00e3o e Controle de Pragas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Licen\u00e7as Sanit\u00e1rias (Vigil\u00e2ncia/Alvar\u00e1)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Taxas de Marketplace/iFood", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.06", name: "M\u00fasica e Entretenimento", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.07", name: "Descart\u00e1veis e Utens\u00edlios de Mesa", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },

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
  { code: "1.01.04", name: "Receita de Horas T\u00e9cnicas", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Receita de Treinamentos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Receita de Licenciamento", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custos de Servi\u00e7os Prestados", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Subcontrata\u00e7\u00e3o de Servi\u00e7os", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "M\u00e3o de Obra Terceirizada", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Materiais Aplicados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Despesas Diretas de Projeto", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Especificas de Servicos
  { code: "4.07", name: "Despesas Espec\u00edficas de Servi\u00e7os", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Software e Ferramentas SaaS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Treinamentos e Capacita\u00e7\u00e3o", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Viagens e Hospedagem", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Certifica\u00e7\u00f5es e Licen\u00e7as Profissionais", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Coworking e Espa\u00e7os Compartilhados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
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
  { code: "1.01.01", name: "Vendas no Varejo (Loja F\u00edsica)", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Vendas no Atacado", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Vendas Online / E-commerce", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Vendas Marketplace", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Vendas por Representantes", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Receita de Frete Cobrado", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "1.01" },
  ...SHARED_OUTRAS_RECEITAS,

  // --- 2 DEDUCOES ---
  ...SHARED_DEDUCOES,

  // --- 3 CUSTOS ---
  { code: "3", name: "CUSTOS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "3.01", name: "Custo das Mercadorias Vendidas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Compra de Mercadorias para Revenda", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Frete sobre Compras", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.03", name: "Seguro sobre Compras", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.04", name: "Embalagens", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.05", name: "Diferen\u00e7as de Invent\u00e1rio", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "3.01" },

  // --- 4 DESPESAS OPERACIONAIS ---
  ...SHARED_DESPESAS_OPERACIONAIS_BASE,
  // 4.07 Despesas Especificas de Comercio
  { code: "4.07", name: "Despesas Espec\u00edficas de Com\u00e9rcio", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.07.01", name: "Taxas de Marketplace (iFood/Mercado Livre/etc)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.02", name: "Frete sobre Vendas / Envios", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.03", name: "Embalagens para Envio", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.04", name: "Devolu\u00e7\u00f5es e Trocas (log\u00edstica reversa)", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.05", name: "Antecipa\u00e7\u00e3o de Receb\u00edveis", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.06", name: "Perdas e Quebras de Estoque", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },
  { code: "4.07.07", name: "Seguro de Mercadorias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "4.07" },

  // --- 5 INVESTIMENTOS E RETIRADAS ---
  ...SHARED_INVESTIMENTOS_RETIRADAS,
];

// ===========================================================================
// 5. CONTABIL TRADICIONAL
// ===========================================================================

const contabilAccounts: TemplateAccount[] = [
  // --- 1 ATIVO ---
  { code: "1", name: "ATIVO", type: "ASSET", level: 1, isAnalytic: false },
  { code: "1.01", name: "Ativo Circulante", type: "ASSET", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.01.01", name: "Caixa", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.02", name: "Bancos Conta Movimento", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.03", name: "Aplica\u00e7\u00f5es Financeiras", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.04", name: "Clientes a Receber", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.05", name: "Adiantamentos a Fornecedores", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.06", name: "Impostos a Recuperar", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.07", name: "Estoques de Mercadorias", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.01.08", name: "Estoques de Mat\u00e9ria-Prima", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.01" },
  { code: "1.02", name: "Ativo N\u00e3o Circulante", type: "ASSET", level: 2, isAnalytic: false, parentCode: "1" },
  { code: "1.02.01", name: "Im\u00f3veis", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.02", name: "Ve\u00edculos", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.03", name: "M\u00e1quinas e Equipamentos", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.04", name: "M\u00f3veis e Utens\u00edlios", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.05", name: "Computadores e Perif\u00e9ricos", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.06", name: "(-) Deprecia\u00e7\u00e3o Acumulada", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.07", name: "Software e Licen\u00e7as", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },
  { code: "1.02.08", name: "Marcas e Patentes", type: "ASSET", level: 3, isAnalytic: true, parentCode: "1.02" },

  // --- 2 PASSIVO ---
  { code: "2", name: "PASSIVO", type: "LIABILITY", level: 1, isAnalytic: false },
  { code: "2.01", name: "Passivo Circulante", type: "LIABILITY", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.01.01", name: "Fornecedores", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.02", name: "Empr\u00e9stimos e Financiamentos CP", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.03", name: "Sal\u00e1rios a Pagar", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.04", name: "Encargos Sociais a Pagar", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.05", name: "Impostos a Pagar", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.06", name: "Provis\u00f5es Trabalhistas", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.01.07", name: "Outras Contas a Pagar", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.01" },
  { code: "2.02", name: "Passivo N\u00e3o Circulante", type: "LIABILITY", level: 2, isAnalytic: false, parentCode: "2" },
  { code: "2.02.01", name: "Empr\u00e9stimos e Financiamentos LP", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.02" },
  { code: "2.02.02", name: "Parcelamentos Tribut\u00e1rios", type: "LIABILITY", level: 3, isAnalytic: true, parentCode: "2.02" },

  // --- 3 PATRIMONIO LIQUIDO ---
  { code: "3", name: "PATRIM\u00d4NIO L\u00cdQUIDO", type: "EQUITY", level: 1, isAnalytic: false },
  { code: "3.01", name: "Capital Social", type: "EQUITY", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.01.01", name: "Capital Subscrito", type: "EQUITY", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.01.02", name: "Capital a Integralizar", type: "EQUITY", level: 3, isAnalytic: true, parentCode: "3.01" },
  { code: "3.02", name: "Reservas e Resultados", type: "EQUITY", level: 2, isAnalytic: false, parentCode: "3" },
  { code: "3.02.01", name: "Reservas de Lucros", type: "EQUITY", level: 3, isAnalytic: true, parentCode: "3.02" },
  { code: "3.02.02", name: "Lucros Acumulados", type: "EQUITY", level: 3, isAnalytic: true, parentCode: "3.02" },
  { code: "3.02.03", name: "Preju\u00edzos Acumulados", type: "EQUITY", level: 3, isAnalytic: true, parentCode: "3.02" },

  // --- 4 RECEITAS ---
  { code: "4", name: "RECEITAS", type: "REVENUE", level: 1, isAnalytic: false },
  { code: "4.01", name: "Receita Operacional", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.01.01", name: "Receita de Vendas de Mercadorias", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.02", name: "Receita de Vendas de Produtos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.01.03", name: "Receita de Presta\u00e7\u00e3o de Servi\u00e7os", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.01" },
  { code: "4.02", name: "Receitas Financeiras", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.02.01", name: "Juros Recebidos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.02", name: "Rendimentos de Aplica\u00e7\u00f5es", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.02.03", name: "Descontos Obtidos", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.02" },
  { code: "4.03", name: "Outras Receitas", type: "REVENUE", level: 2, isAnalytic: false, parentCode: "4" },
  { code: "4.03.01", name: "Receitas N\u00e3o Operacionais", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.03" },
  { code: "4.03.02", name: "Revers\u00e3o de Provis\u00f5es", type: "REVENUE", level: 3, isAnalytic: true, parentCode: "4.03" },

  // --- 5 DESPESAS ---
  { code: "5", name: "DESPESAS", type: "EXPENSE", level: 1, isAnalytic: false },
  { code: "5.01", name: "Custos", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.01.01", name: "CMV - Custo das Mercadorias Vendidas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.02", name: "CPV - Custo dos Produtos Vendidos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.01.03", name: "CSV - Custo dos Servi\u00e7os Prestados", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.01" },
  { code: "5.02", name: "Despesas Operacionais", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.02.01", name: "Despesas com Pessoal", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.02", name: "Despesas Administrativas", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.03", name: "Despesas Comerciais", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.02.04", name: "Despesas Tribut\u00e1rias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.02" },
  { code: "5.03", name: "Despesas Financeiras", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.03.01", name: "Juros sobre Empr\u00e9stimos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.03" },
  { code: "5.03.02", name: "Tarifas Banc\u00e1rias", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.03" },
  { code: "5.03.03", name: "Descontos Concedidos", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.03" },
  { code: "5.04", name: "Impostos sobre Vendas", type: "EXPENSE", level: 2, isAnalytic: false, parentCode: "5" },
  { code: "5.04.01", name: "ICMS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
  { code: "5.04.02", name: "ISS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
  { code: "5.04.03", name: "PIS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
  { code: "5.04.04", name: "COFINS", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
  { code: "5.04.05", name: "IPI", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
  { code: "5.04.06", name: "Simples Nacional", type: "EXPENSE", level: 3, isAnalytic: true, parentCode: "5.04" },
];

// ===========================================================================
// CHART_TEMPLATES - main export
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
    name: "Presta\u00e7\u00e3o de Servi\u00e7os",
    description:
      "Para consultorias, ag\u00eancias, escrit\u00f3rios, TI e profissionais liberais.",
    accounts: servicosAccounts,
  },
  {
    id: "comercio",
    name: "Com\u00e9rcio",
    description: "Para varejo, atacado, e-commerce e lojas.",
    accounts: comercioAccounts,
  },
  {
    id: "contabil",
    name: "Cont\u00e1bil Tradicional",
    description:
      "Plano de contas cont\u00e1bil tradicional com Ativo, Passivo, PL, Receita e Despesa.",
    accounts: contabilAccounts,
  },
];

// ===========================================================================
// Helper
// ===========================================================================

export function getTemplate(id: string): ChartTemplate | undefined {
  return CHART_TEMPLATES.find((t) => t.id === id);
}
