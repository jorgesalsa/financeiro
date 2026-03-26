export type TemplateProduct = {
  code: string;
  name: string;
  description?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
};

export type ProductTemplate = {
  id: string;
  name: string;
  description: string;
  products: TemplateProduct[];
};

// ===========================================================================
// 1. ALIMENTOS E BEBIDAS
// ===========================================================================

const alimentosBebidasProducts: TemplateProduct[] = [
  // --- Pratos / Alimentos ---
  { code: "ALM-001", name: "Prato do Dia", unit: "UN", costPrice: 12, salePrice: 29.90 },
  { code: "ALM-002", name: "Prato Executivo", unit: "UN", costPrice: 15, salePrice: 35.90 },
  { code: "ALM-003", name: "Porção / Petisco", unit: "UN", costPrice: 8, salePrice: 24.90 },
  { code: "ALM-004", name: "Sobremesa", unit: "UN", costPrice: 5, salePrice: 14.90 },
  { code: "ALM-005", name: "Salada", unit: "UN", costPrice: 6, salePrice: 18.90 },
  { code: "ALM-006", name: "Sopa / Caldo", unit: "UN", costPrice: 4, salePrice: 15.90 },
  { code: "ALM-007", name: "Lanche / Sanduíche", unit: "UN", costPrice: 7, salePrice: 22.90 },
  { code: "ALM-008", name: "Pizza", unit: "UN", costPrice: 12, salePrice: 39.90 },
  { code: "ALM-009", name: "Marmita / Quentinha", unit: "UN", costPrice: 8, salePrice: 18.90 },
  { code: "ALM-010", name: "Combo / Kit Refeição", unit: "UN", costPrice: 15, salePrice: 34.90 },

  // --- Bebidas ---
  { code: "BEB-001", name: "Água Mineral", unit: "UN", costPrice: 1, salePrice: 4 },
  { code: "BEB-002", name: "Refrigerante Lata", unit: "UN", costPrice: 2, salePrice: 6 },
  { code: "BEB-003", name: "Refrigerante 2L", unit: "UN", costPrice: 4.5, salePrice: 12 },
  { code: "BEB-004", name: "Suco Natural", unit: "UN", costPrice: 3, salePrice: 10 },
  { code: "BEB-005", name: "Cerveja Long Neck", unit: "UN", costPrice: 3.5, salePrice: 12 },
  { code: "BEB-006", name: "Cerveja 600ml", unit: "UN", costPrice: 5, salePrice: 16 },
  { code: "BEB-007", name: "Chopp", unit: "UN", costPrice: 3, salePrice: 14 },
  { code: "BEB-008", name: "Caipirinha / Drink", unit: "UN", costPrice: 5, salePrice: 22 },
  { code: "BEB-009", name: "Vinho Taça", unit: "UN", costPrice: 6, salePrice: 25 },
  { code: "BEB-010", name: "Café / Expresso", unit: "UN", costPrice: 0.8, salePrice: 5 },

  // --- Insumos (para controle de estoque) ---
  { code: "INS-001", name: "Carne Bovina", unit: "KG", costPrice: 35, salePrice: 0 },
  { code: "INS-002", name: "Frango", unit: "KG", costPrice: 14, salePrice: 0 },
  { code: "INS-003", name: "Peixe / Frutos do Mar", unit: "KG", costPrice: 45, salePrice: 0 },
  { code: "INS-004", name: "Arroz", unit: "KG", costPrice: 5, salePrice: 0 },
  { code: "INS-005", name: "Feijão", unit: "KG", costPrice: 7, salePrice: 0 },
  { code: "INS-006", name: "Legumes e Verduras", unit: "KG", costPrice: 6, salePrice: 0 },
  { code: "INS-007", name: "Frutas", unit: "KG", costPrice: 8, salePrice: 0 },
  { code: "INS-008", name: "Óleo de Cozinha", unit: "L", costPrice: 8, salePrice: 0 },
  { code: "INS-009", name: "Temperos e Condimentos", unit: "KG", costPrice: 20, salePrice: 0 },
  { code: "INS-010", name: "Embalagens Delivery", unit: "UN", costPrice: 1.5, salePrice: 0 },
  { code: "INS-011", name: "Gás de Cozinha (P45)", unit: "UN", costPrice: 380, salePrice: 0 },
  { code: "INS-012", name: "Descartáveis (copos, pratos)", unit: "PCT", costPrice: 15, salePrice: 0 },

  // --- Taxas / Serviços ---
  { code: "TAX-001", name: "Taxa de Entrega", unit: "UN", costPrice: 3, salePrice: 7 },
  { code: "TAX-002", name: "Couvert Artístico", unit: "UN", costPrice: 0, salePrice: 15 },
  { code: "TAX-003", name: "Taxa de Serviço (10%)", unit: "UN", costPrice: 0, salePrice: 0 },
];

// ===========================================================================
// 2. PRESTAÇÃO DE SERVIÇOS
// ===========================================================================

const servicosProducts: TemplateProduct[] = [
  // --- Serviços por hora ---
  { code: "SRV-001", name: "Hora Técnica - Júnior", unit: "HR", costPrice: 30, salePrice: 80 },
  { code: "SRV-002", name: "Hora Técnica - Pleno", unit: "HR", costPrice: 50, salePrice: 130 },
  { code: "SRV-003", name: "Hora Técnica - Sênior", unit: "HR", costPrice: 80, salePrice: 200 },
  { code: "SRV-004", name: "Hora de Consultoria", unit: "HR", costPrice: 100, salePrice: 300 },
  { code: "SRV-005", name: "Hora Extra", unit: "HR", costPrice: 60, salePrice: 180 },

  // --- Projetos / Pacotes ---
  { code: "PRJ-001", name: "Projeto - Escopo Pequeno", unit: "UN", costPrice: 2000, salePrice: 5000 },
  { code: "PRJ-002", name: "Projeto - Escopo Médio", unit: "UN", costPrice: 5000, salePrice: 15000 },
  { code: "PRJ-003", name: "Projeto - Escopo Grande", unit: "UN", costPrice: 15000, salePrice: 40000 },
  { code: "PRJ-004", name: "Sprint / Iteração", unit: "UN", costPrice: 3000, salePrice: 8000 },

  // --- Recorrentes / Mensalidades ---
  { code: "MEN-001", name: "Mensalidade - Plano Básico", unit: "MES", costPrice: 200, salePrice: 500 },
  { code: "MEN-002", name: "Mensalidade - Plano Intermediário", unit: "MES", costPrice: 500, salePrice: 1500 },
  { code: "MEN-003", name: "Mensalidade - Plano Avançado", unit: "MES", costPrice: 1000, salePrice: 3000 },
  { code: "MEN-004", name: "Suporte Técnico Mensal", unit: "MES", costPrice: 300, salePrice: 800 },
  { code: "MEN-005", name: "Manutenção Mensal", unit: "MES", costPrice: 200, salePrice: 600 },

  // --- Treinamentos ---
  { code: "TRN-001", name: "Treinamento Individual (hora)", unit: "HR", costPrice: 60, salePrice: 200 },
  { code: "TRN-002", name: "Treinamento em Grupo", unit: "UN", costPrice: 500, salePrice: 2000 },
  { code: "TRN-003", name: "Workshop", unit: "UN", costPrice: 800, salePrice: 3000 },

  // --- Licenciamento ---
  { code: "LIC-001", name: "Licença de Software - Mensal", unit: "MES", costPrice: 50, salePrice: 200 },
  { code: "LIC-002", name: "Licença de Software - Anual", unit: "ANO", costPrice: 500, salePrice: 2000 },
  { code: "LIC-003", name: "Licença por Usuário", unit: "UN", costPrice: 20, salePrice: 80 },

  // --- Despesas Reembolsáveis ---
  { code: "RMB-001", name: "Deslocamento / Km Rodado", unit: "KM", costPrice: 1.2, salePrice: 1.8 },
  { code: "RMB-002", name: "Hospedagem", unit: "DIARIA", costPrice: 200, salePrice: 200 },
  { code: "RMB-003", name: "Alimentação em Viagem", unit: "DIARIA", costPrice: 80, salePrice: 80 },
];

// ===========================================================================
// 3. COMÉRCIO
// ===========================================================================

const comercioProducts: TemplateProduct[] = [
  // --- Categorias de produtos genéricas (varejo/atacado) ---
  { code: "MRC-001", name: "Mercadoria para Revenda - Categoria A", unit: "UN", costPrice: 0, salePrice: 0, description: "Ajuste código, nome e preço conforme seu mix de produtos" },
  { code: "MRC-002", name: "Mercadoria para Revenda - Categoria B", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "MRC-003", name: "Mercadoria para Revenda - Categoria C", unit: "UN", costPrice: 0, salePrice: 0 },

  // --- Vestuário (exemplo) ---
  { code: "VST-001", name: "Camiseta", unit: "UN", costPrice: 20, salePrice: 59.90 },
  { code: "VST-002", name: "Calça", unit: "UN", costPrice: 40, salePrice: 119.90 },
  { code: "VST-003", name: "Vestido", unit: "UN", costPrice: 35, salePrice: 99.90 },
  { code: "VST-004", name: "Calçado", unit: "PAR", costPrice: 45, salePrice: 139.90 },
  { code: "VST-005", name: "Acessório", unit: "UN", costPrice: 10, salePrice: 39.90 },

  // --- Eletrônicos (exemplo) ---
  { code: "ELT-001", name: "Celular / Smartphone", unit: "UN", costPrice: 800, salePrice: 1499.90 },
  { code: "ELT-002", name: "Tablet", unit: "UN", costPrice: 600, salePrice: 1199.90 },
  { code: "ELT-003", name: "Fone de Ouvido", unit: "UN", costPrice: 30, salePrice: 89.90 },
  { code: "ELT-004", name: "Carregador / Cabo", unit: "UN", costPrice: 10, salePrice: 39.90 },
  { code: "ELT-005", name: "Capinha / Película", unit: "UN", costPrice: 3, salePrice: 19.90 },

  // --- Material de Construção (exemplo) ---
  { code: "MAT-001", name: "Cimento (saco 50kg)", unit: "SC", costPrice: 28, salePrice: 38.90 },
  { code: "MAT-002", name: "Tinta (galão 3.6L)", unit: "GL", costPrice: 55, salePrice: 89.90 },
  { code: "MAT-003", name: "Ferramentas", unit: "UN", costPrice: 20, salePrice: 49.90 },

  // --- Cosméticos / Beleza (exemplo) ---
  { code: "COS-001", name: "Shampoo / Condicionador", unit: "UN", costPrice: 8, salePrice: 24.90 },
  { code: "COS-002", name: "Creme / Hidratante", unit: "UN", costPrice: 12, salePrice: 34.90 },
  { code: "COS-003", name: "Maquiagem", unit: "UN", costPrice: 15, salePrice: 49.90 },

  // --- Operacional ---
  { code: "EMB-001", name: "Sacola / Embalagem", unit: "UN", costPrice: 0.30, salePrice: 0 },
  { code: "EMB-002", name: "Caixa para Envio", unit: "UN", costPrice: 2, salePrice: 0 },
  { code: "FRT-001", name: "Frete / Entrega", unit: "UN", costPrice: 10, salePrice: 15 },
  { code: "BRD-001", name: "Brinde Promocional", unit: "UN", costPrice: 5, salePrice: 0 },
];

// ===========================================================================
// 4. GERAL (Produtos e Serviços Genéricos)
// ===========================================================================

const geralProducts: TemplateProduct[] = [
  // --- Produtos ---
  { code: "PRD-001", name: "Produto Genérico 1", unit: "UN", costPrice: 0, salePrice: 0, description: "Altere código e nome conforme necessidade" },
  { code: "PRD-002", name: "Produto Genérico 2", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "PRD-003", name: "Produto Genérico 3", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "PRD-004", name: "Produto por Peso", unit: "KG", costPrice: 0, salePrice: 0 },
  { code: "PRD-005", name: "Produto por Volume", unit: "L", costPrice: 0, salePrice: 0 },

  // --- Serviços ---
  { code: "SRV-001", name: "Serviço Geral", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "SRV-002", name: "Hora de Serviço", unit: "HR", costPrice: 0, salePrice: 0 },
  { code: "SRV-003", name: "Diária de Serviço", unit: "DIARIA", costPrice: 0, salePrice: 0 },
  { code: "SRV-004", name: "Mensalidade / Assinatura", unit: "MES", costPrice: 0, salePrice: 0 },

  // --- Taxas ---
  { code: "TAX-001", name: "Taxa de Entrega / Frete", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "TAX-002", name: "Taxa de Instalação", unit: "UN", costPrice: 0, salePrice: 0 },
  { code: "TAX-003", name: "Taxa de Manutenção", unit: "UN", costPrice: 0, salePrice: 0 },
];

// ===========================================================================
// PRODUCT_TEMPLATES - main export
// ===========================================================================

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "geral",
    name: "Geral",
    description: "Produtos e serviços genéricos para qualquer tipo de empresa.",
    products: geralProducts,
  },
  {
    id: "alimentos_bebidas",
    name: "Alimentos e Bebidas",
    description:
      "Pratos, bebidas, insumos e taxas para restaurantes, bares e delivery.",
    products: alimentosBebidasProducts,
  },
  {
    id: "servicos",
    name: "Prestação de Serviços",
    description:
      "Horas técnicas, projetos, mensalidades, treinamentos e licenças.",
    products: servicosProducts,
  },
  {
    id: "comercio",
    name: "Comércio",
    description:
      "Exemplos de produtos para varejo, atacado e e-commerce por segmento.",
    products: comercioProducts,
  },
];

export function getProductTemplate(id: string): ProductTemplate | undefined {
  return PRODUCT_TEMPLATES.find((t) => t.id === id);
}
