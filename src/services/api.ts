import { db } from './db';
import {
  User, Invoice, BusinessSettings, DashboardStats, PaymentMethod
} from '../types';

const delay = (ms: number = 50) => new Promise(resolve => setTimeout(resolve, ms));

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
      await delay(10);
      return db.getCurrentUser();
    },
    logout: async (): Promise<void> => {
      await delay(20);
      db.setCurrentUser(null);
    },
    updateProfile: async (userId: string, profile: { name: string; email: string; phone?: string; avatar?: string }): Promise<User> => {
      await delay();
      return db.updateUser(userId, profile);
    },
    changePassword: async (userId: string, currentPass: string, newPass: string): Promise<void> => {
      await delay();
      const res = db.changePassword(userId, currentPass, newPass);
      if (!res.success) {
        throw new Error(res.error || 'Failed to change password');
      }
    },
    resetPassword: async (userId: string, newPass: string): Promise<void> => {
      await delay();
      const res = db.resetPassword(userId, newPass);
      if (!res.success) {
        throw new Error(res.error || 'Failed to reset password');
      }
    },
    resetPasswordByEmail: async (email: string, newPass: string): Promise<User> => {
      await delay();
      const res = db.resetPasswordByEmail(email, newPass);
      if (!res.success || !res.user) {
        throw new Error(res.error || 'Failed to reset password');
      }
      return res.user;
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
    getNextInvoiceNumber: async (): Promise<string> => {
      await delay(10);
      return db.generateNextInvoiceNumber();
    },
  },

  // --- Dashboard APIs ---
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      await delay();
      return db.getDashboardStats();
    },
    getDailySales: async () => {
      await delay();
      return db.getDailySalesChartData();
    },
    getMonthlySales: async () => {
      await delay();
      return db.getMonthlySalesChartData();
    },
    getRecentInvoices: async (limit: number = 6): Promise<Invoice[]> => {
      await delay();
      return db.getInvoices().slice(0, limit);
    },
  },

  // --- Reports APIs ---
  reports: {
    getSummary: async (range: string = 'all', startDate?: string, endDate?: string) => {
      await delay();
      const invoices = db.getInvoices();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let filtered = invoices;
      if (range === 'today') {
        filtered = invoices.filter(inv => inv.date === todayStr);
      } else if (range === 'week') {
        filtered = invoices.filter(inv => {
          const diff = (now.getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
          return diff <= 7;
        });
      } else if (range === 'month') {
        filtered = invoices.filter(inv => {
          const d = new Date(inv.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (range === 'custom') {
        filtered = invoices.filter(inv => {
          if (startDate && inv.date < startDate) return false;
          if (endDate && inv.date > endDate) return false;
          return true;
        });
      }

      const totalRevenue = filtered.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalBills = filtered.length;

      // Today's, Weekly, Monthly sales
      const todaySales = invoices
        .filter(inv => inv.date === todayStr)
        .reduce((acc, inv) => acc + inv.grandTotal, 0);

      const weeklySales = invoices
        .filter(inv => {
          const diff = (now.getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
          return diff <= 7;
        })
        .reduce((acc, inv) => acc + inv.grandTotal, 0);

      const monthlySales = invoices
        .filter(inv => {
          const d = new Date(inv.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((acc, inv) => acc + inv.grandTotal, 0);

      return {
        todaySales: Number(todaySales.toFixed(2)),
        weeklySales: Number(weeklySales.toFixed(2)),
        monthlySales: Number(monthlySales.toFixed(2)),
        totalBills,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        filteredInvoices: filtered,
      };
    },
    getDailySales: async () => {
      await delay();
      return db.getDailySalesChartData();
    },
    getMonthlySales: async () => {
      await delay();
      return db.getMonthlySalesChartData();
    },
    getPaymentSummary: async () => {
      await delay();
      return db.getPaymentMethodSummary();
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
      await delay(10);
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
};
