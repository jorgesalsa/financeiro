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
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Plano de Contas", href: "/master-data/chart-of-accounts", icon: BookOpen },
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
      { title: "Notas Fiscais (Qive)", href: "/imports/tax-invoices", icon: Upload },
      { title: "Extrato Bancário", href: "/imports/bank-statements", icon: Upload },
      { title: "Cartões", href: "/imports/card-transactions", icon: Upload },
      { title: "NFs de Compra", href: "/imports/purchase-invoices", icon: Upload },
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
      { title: "Configurações", href: "/settings/general", icon: Settings },
    ],
  },
];
