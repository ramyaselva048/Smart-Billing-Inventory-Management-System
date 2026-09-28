export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phone?: string;
  avatar?: string;
  password?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Discount amount in ₹
  gst: number; // GST rate percentage e.g. 0, 5, 12, 18, 28
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card';
export type PaymentStatus = 'PAID';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-00001
  date: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  notes?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  businessAddress: string;
  phone: string;
  email: string;
  gstNumber: string;
  invoicePrefix: string;
  logoUrl?: string;
}

export interface DashboardStats {
  todaySales: number;
  todayBills: number;
  weeklySales?: number;
  monthlySales?: number;
  yearlySales?: number;
  totalSales: number;
  totalBills: number;
}

export type DateFilterRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export interface ReportsSummary {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
  totalBills: number;
  totalRevenue: number;
  filteredInvoices: Invoice[];
}
