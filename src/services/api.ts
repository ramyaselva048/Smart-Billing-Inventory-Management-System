import { db } from './db';
import {
  User, Product, Category, Customer, Invoice, Payment,
  StockTransaction, Notification, BusinessSettings, AuditLog, DashboardStats
} from '../types';

// Helper to simulate realistic async REST latency
const delay = (ms: number = 80) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // --- Auth APIs ---
  auth: {
    login: async (email: string, pass: string): Promise<{ user: User; token: string }> => {
      await delay();
      const res = db.login(email, pass);
      if (!res.success || !res.user) {
        throw new Error(res.error || 'Authentication failed');
      }
      return { user: res.user, token: `jwt-token-${res.user.id}-${Date.now()}` };
    },
    getCurrentUser: async (): Promise<User | null> => {
      await delay(20);
      return db.getCurrentUser();
    },
    logout: async (): Promise<void> => {
      await delay(40);
      db.setCurrentUser(null);
    },
  },

  // --- Products APIs ---
  products: {
    getAll: async (): Promise<Product[]> => {
      await delay();
      return db.getProducts();
    },
    getById: async (id: string): Promise<Product> => {
      await delay();
      const p = db.getProductById(id);
      if (!p) throw new Error('Product not found');
      return p;
    },
    create: async (data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
      await delay();
      return db.addProduct(data);
    },
    update: async (id: string, updates: Partial<Product>): Promise<Product> => {
      await delay();
      return db.updateProduct(id, updates);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      await delay();
      db.deleteProduct(id);
      return { success: true };
    },
  },

  // --- Categories APIs ---
  categories: {
    getAll: async (): Promise<Category[]> => {
      await delay();
      return db.getCategories();
    },
    create: async (data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
      await delay();
      return db.addCategory(data);
    },
    update: async (id: string, updates: Partial<Category>): Promise<Category> => {
      await delay();
      return db.updateCategory(id, updates);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      await delay();
      db.deleteCategory(id);
      return { success: true };
    },
  },

  // --- Customers APIs ---
  customers: {
    getAll: async (): Promise<Customer[]> => {
      await delay();
      return db.getCustomers();
    },
    getById: async (id: string): Promise<Customer> => {
      await delay();
      const c = db.getCustomerById(id);
      if (!c) throw new Error('Customer not found');
      return c;
    },
    create: async (data: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'outstandingAmount'>): Promise<Customer> => {
      await delay();
      return db.addCustomer(data);
    },
    update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
      await delay();
      return db.updateCustomer(id, updates);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      await delay();
      db.deleteCustomer(id);
      return { success: true };
    },
  },

  // --- Invoices APIs ---
  invoices: {
    getAll: async (): Promise<Invoice[]> => {
      await delay();
      return db.getInvoices();
    },
    getById: async (id: string): Promise<Invoice> => {
      await delay();
      const inv = db.getInvoiceById(id);
      if (!inv) throw new Error('Invoice not found');
      return inv;
    },
    create: async (data: Parameters<typeof db.createInvoice>[0]): Promise<Invoice> => {
      await delay();
      return db.createInvoice(data);
    },
    cancel: async (id: string, reason: string): Promise<Invoice> => {
      await delay();
      return db.cancelInvoice(id, reason);
    },
    getNextInvoiceNumber: async (): Promise<string> => {
      await delay(10);
      return db.generateNextInvoiceNumber();
    },
  },

  // --- Payments APIs ---
  payments: {
    getAll: async (): Promise<Payment[]> => {
      await delay();
      return db.getPayments();
    },
    create: async (data: Parameters<typeof db.recordPayment>[0]): Promise<Payment> => {
      await delay();
      return db.recordPayment(data);
    },
  },

  // --- Inventory APIs ---
  inventory: {
    getTransactions: async (): Promise<StockTransaction[]> => {
      await delay();
      return db.getStockTransactions();
    },
    stockIn: async (productId: string, quantity: number, reason: string): Promise<StockTransaction> => {
      await delay();
      return db.stockIn(productId, quantity, reason);
    },
    stockAdjustment: async (productId: string, newStockLevel: number, reason: string): Promise<StockTransaction> => {
      await delay();
      return db.stockAdjustment(productId, newStockLevel, reason);
    },
  },

  // --- Dashboard APIs ---
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      await delay();
      return db.getDashboardStats();
    },
    getSalesChart: async () => {
      await delay();
      return db.getMonthlySalesChartData();
    },
    getCategoryChart: async () => {
      await delay();
      return db.getSalesByCategory();
    },
    getRecentInvoices: async (limit: number = 5): Promise<Invoice[]> => {
      await delay();
      return db.getInvoices().slice(0, limit);
    },
  },

  // --- Reports APIs ---
  reports: {
    getSalesSummary: async (days: number = 30) => {
      await delay();
      const invoices = db.getInvoices().filter(i => i.status !== 'cancelled');
      const payments = db.getPayments();

      const totalSales = invoices.reduce((acc, i) => acc + i.grandTotal, 0);
      const totalTax = invoices.reduce((acc, i) => acc + (i.totalCgst + i.totalSgst + i.totalIgst), 0);
      const totalDiscount = invoices.reduce((acc, i) => acc + i.totalDiscount, 0);
      const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
      const totalPending = invoices.reduce((acc, i) => acc + i.balanceAmount, 0);

      return {
        totalInvoices: invoices.length,
        totalSales,
        totalTax,
        totalDiscount,
        totalCollected,
        totalPending,
      };
    },
    getGstLiability: async () => {
      await delay();
      const invoices = db.getInvoices().filter(i => i.status !== 'cancelled');
      let taxableTotal = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;

      for (const inv of invoices) {
        taxableTotal += inv.taxableAmount;
        cgstTotal += inv.totalCgst;
        sgstTotal += inv.totalSgst;
        igstTotal += inv.totalIgst;
      }

      return {
        taxableTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        grandTaxTotal: cgstTotal + sgstTotal + igstTotal,
      };
    },
  },

  // --- Users APIs ---
  users: {
    getAll: async (): Promise<User[]> => {
      await delay();
      return db.getUsers();
    },
    create: async (data: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
      await delay();
      return db.addUser(data);
    },
    update: async (id: string, updates: Partial<User>): Promise<User> => {
      await delay();
      return db.updateUser(id, updates);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      await delay();
      db.deleteUser(id);
      return { success: true };
    },
  },

  // --- Settings APIs ---
  settings: {
    get: async (): Promise<BusinessSettings> => {
      await delay(20);
      return db.getSettings();
    },
    update: async (updates: Partial<BusinessSettings>): Promise<BusinessSettings> => {
      await delay();
      return db.updateSettings(updates);
    },
    resetToFactory: async (): Promise<void> => {
      await delay();
      db.resetToFactory();
    },
  },

  // --- Notifications APIs ---
  notifications: {
    getAll: async (): Promise<Notification[]> => {
      await delay(20);
      return db.getNotifications();
    },
    markAsRead: async (id: string): Promise<void> => {
      db.markNotificationAsRead(id);
    },
    markAllAsRead: async (): Promise<void> => {
      db.markAllNotificationsAsRead();
    },
    delete: async (id: string): Promise<void> => {
      db.deleteNotification(id);
    },
    clearAll: async (): Promise<void> => {
      db.clearAllNotifications();
    },
    clearRead: async (): Promise<void> => {
      db.clearReadNotifications();
    },
  },

  // --- Audit Logs APIs ---
  audit: {
    getAll: async (): Promise<AuditLog[]> => {
      await delay();
      return db.getAuditLogs();
    },
  },
};
