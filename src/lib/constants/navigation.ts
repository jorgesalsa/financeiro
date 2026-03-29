import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  Landmark,
  CreditCard,
  Package,
  Warehouse,
  Upload,
  FileCheck,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Repeat,
  Calendar,
  Scale,
  BarChart3,
  Clock,
  DollarSign,
  Target,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Shield,
  Settings,
  Plug,
  Layers,
  UserCog,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Painel Geral", href: "/dashboard/multi-tenant", icon: Layers },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Categorias", href: "/master-data/chart-of-accounts", icon: BookOpen },
      { title: "Fornecedores", href: "/master-data/suppliers", icon: Building2 },
      { title: "Clientes", href: "/master-data/customers", icon: Users },
      { title: "Centros de Custo", href: "/master-data/cost-centers", icon: Target },
      { title: "Contas Bancárias", href: "/master-data/bank-accounts", icon: Landmark },
      { title: "Formas de Pagamento", href: "/master-data/payment-methods", icon: CreditCard },
      { title: "Produtos", href: "/master-data/products", icon: Package },
      { title: "Almoxarifados", href: "/master-data/warehouses", icon: Warehouse },
    ],
  },
  {
    label: "Importações",
    items: [
      { title: "Notas Fiscais (CSV/XML)", href: "/imports/tax-invoices", icon: Upload },
      { title: "QIVE (Automático)", href: "/imports/qive", icon: Plug },
      { title: "Extrato Bancário", href: "/imports/bank-statements", icon: Upload },
      { title: "Cartões", href: "/imports/card-transactions", icon: Upload },
      { title: "NFs de Compra", href: "/imports/purchase-invoices", icon: Upload },
      { title: "Conexoes Bancarias", href: "/imports/pluggy", icon: Plug },
    ],
  },
  {
    label: "Migracao",
    items: [
      { title: "Visao Geral", href: "/migration", icon: Layers },
      { title: "Nova Migracao", href: "/migration/new", icon: Upload },
      { title: "Historico", href: "/migration/history", icon: Clock },
    ],
  },
  {
    label: "Staging",
    items: [
      { title: "Lançamentos", href: "/staging", icon: FileCheck },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Lançamentos", href: "/financial/entries", icon: Receipt },
      { title: "Contas a Pagar", href: "/financial/payables", icon: ArrowDownCircle },
      { title: "Contas a Receber", href: "/financial/receivables", icon: ArrowUpCircle },
      { title: "Recorrências", href: "/financial/recurring", icon: Repeat },
      { title: "Notas Fiscais", href: "/financial/tax-invoices", icon: FileText },
      { title: "Transferencias Internas", href: "/financial/transfers", icon: ArrowRightLeft },
      { title: "Parcelas", href: "/financial/installments", icon: DollarSign },
      { title: "Agenda Financeira", href: "/financial/calendar", icon: Calendar },
    ],
  },
  {
    label: "Conciliação",
    items: [
      { title: "Bancária", href: "/reconciliation/bank", icon: Scale },
      { title: "Cartões", href: "/reconciliation/cards", icon: CreditCard },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Fluxo de Caixa", href: "/cash-flow", icon: DollarSign },
      { title: "DRE", href: "/reports/income-statement", icon: BarChart3 },
      { title: "Aging", href: "/reports/aging", icon: Clock },
      { title: "Orçamento × Realizado", href: "/reports/budget-vs-actual", icon: Target },
      { title: "Fechamento", href: "/reports/closing", icon: ClipboardCheck },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Movimentações", href: "/inventory/movements", icon: Package },
      { title: "Kardex", href: "/inventory/kardex", icon: FileText },
      { title: "Posição", href: "/inventory/position", icon: Warehouse },
    ],
  },
  {
    label: "Controles",
    items: [
      { title: "Check Diário", href: "/controls/daily-check", icon: ClipboardCheck },
      { title: "Pendências", href: "/controls/pending-items", icon: AlertTriangle },
      { title: "Log de Auditoria", href: "/controls/audit-log", icon: FileText },
      { title: "Exceções", href: "/controls/exceptions", icon: AlertTriangle },
      { title: "Governança", href: "/controls/governance", icon: Shield },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Geral", href: "/settings/general", icon: Settings },
      { title: "Regras de Classificacao", href: "/settings/classification-rules", icon: SlidersHorizontal },
      { title: "Empresas", href: "/settings/companies", icon: Building2 },
      { title: "Usuários", href: "/settings/users", icon: UserCog },
    ],
  },
];
