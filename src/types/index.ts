export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  color: string;
  createdAt: string;
}

export type UnitType = 'pcs' | 'box' | 'kg' | 'g' | 'ltr' | 'ml' | 'meter' | 'pack' | 'set';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  stock: number;
  minStock: number;
  unit: UnitType;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  gstin?: string;
  totalPurchases: number;
  outstandingAmount: number;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit';
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';
export type InvoiceStatus = 'active' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  status: 'Completed' | 'Pending';
  recordedBy: string;
}

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  invoiceNumber?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'out_of_stock' | 'payment_pending' | 'invoice_created' | 'system';
  read: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  defaultGstRate: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  invoiceTerms: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  module: 'auth' | 'product' | 'category' | 'customer' | 'invoice' | 'payment' | 'inventory' | 'user' | 'settings';
  description: string;
  timestamp: string;
}

export interface DashboardStats {
  totalSales: number;
  todaySales: number;
  totalBills: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceivables: number;
  totalRevenue: number;
}
