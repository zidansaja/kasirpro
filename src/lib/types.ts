export type UserRole = 'ADMIN' | 'KASIR';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';
export type StockOpnameStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ViewType = 
  | 'login'
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'pos'
  | 'stock-opname'
  | 'returns'
  | 'expenses'
  | 'shifts'
  | 'reports'
  | 'users'
  | 'transactions'
  | 'customers'
  | 'suppliers'
  | 'purchase-orders'
  | 'backup'
  | 'settings'
  | 'audit-logs';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  userId: string;
  shiftId?: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  customerName?: string;
  taxAmount?: number;
  taxEnabled?: boolean;
  taxPercent?: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transactionItems?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: string;
}

export interface StockOpname {
  id: string;
  userId: string;
  month: number;
  year: number;
  note?: string;
  status: StockOpnameStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  items?: StockOpnameItem[];
}

export interface StockOpnameItem {
  id: string;
  stockOpnameId: string;
  productId: string;
  productName: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  note?: string;
}

export interface ProductReturn {
  id: string;
  returnNumber: string;
  transactionId?: string;
  userId: string;
  totalRefund: number;
  reason: string;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transaction?: Transaction;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactionCount: number;
  totalProducts: number;
  lowStockCount: number;
  monthlyRevenue: number;
  monthlyTransactionCount: number;
  yearlyRevenue: number;
  yearlyTransactionCount: number;
  recentTransactions: Transaction[];
  lowStockProducts: Product[];
  dailyRevenue: { date: string; revenue: number; count: number }[];
  hourlyRevenue: { hour: number; revenue: number; count: number }[];
  topProductsWeekly: {
    productId: string;
    productName: string;
    totalRevenue: number;
    totalQuantity: number;
    dailyData: { date: string; revenue: number; quantity: number }[];
  }[];
}

export interface Shift {
  id: string;
  userId: string;
  openedAt: string;
  closedAt?: string;
  startCash: number;
  endCash?: number;
  expectedCash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
  note?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transactions?: Transaction[];
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  lastVisitAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
  transactions?: Transaction[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
  products?: Product[];
}

export interface DailyReport {
  date: string;
  transactionCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalTax: number;
  transactions: Transaction[];
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId?: string;
  supplier?: Supplier;
  userId: string;
  user?: User;
  date: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
  _count?: { items: number };
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  buyPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface MonthlyReport {
  month: number;
  year: number;
  transactionCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalTax: number;
  dailyBreakdown: { date: string; revenue: number; count: number }[];
}

export interface YearlyReport {
  year: number;
  transactionCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalTax: number;
  monthlyBreakdown: { month: number; revenue: number; count: number }[];
}

export interface StoreSetting {
  id: string;
  storeName: string;
  address?: string;
  phone?: string;
  email?: string;
  taxEnabled: boolean;
  taxPercent: number;
  currency: string;
  receiptFooter?: string;
  // Receipt print settings
  receiptPaperWidth: number;    // mm: 58 or 80
  receiptFontSize: string;      // small, medium, large
  receiptCharPerLine: number;   // chars per line
  receiptLineSpacing: string;   // compact, normal, relaxed
  receiptMargin: number;        // mm margin
  receiptShowLogo: boolean;
  receiptShowAddress: boolean;
  receiptShowPhone: boolean;
  receiptShowEmail: boolean;
  receiptShowTax: boolean;
  receiptShowPayment: boolean;
  receiptShowQrCode: boolean;
  receiptShowItems: boolean;
  receiptDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}
