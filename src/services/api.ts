import { db } from './db';
import {
  User,
  Invoice,
  BusinessSettings,
  DashboardStats,
  ReportsSummary,
} from '../types';

export interface DatabaseStatus {
  status: 'ok' | 'error';
  connected: boolean;
  database?: string;
  version?: string;
  pingMs?: number;
  engine?: string;
  host?: string;
  counts?: {
    users: number;
    invoices: number;
  };
  error?: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Request failed`);
  }
  return data as T;
}

export const api = {
  // --- Database Health & Status API ---
  database: {
    getStatus: async (): Promise<DatabaseStatus> => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err: any) {
        return {
          status: 'error',
          connected: false,
          error: err.message || 'Server unreachable',
        };
      }
    },
  },

  // --- Auth APIs ---
  auth: {
    login: async (email: string, pass: string): Promise<{ user: User; token: string }> => {
      try {
        const res = await request<{ user: User; token: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password: pass }),
        });
        db.setCurrentUser(res.user);
        return res;
      } catch (err) {
        // Fallback to local if server is offline
        const localRes = db.login(email, pass);
        if (!localRes.success || !localRes.user) {
          throw err;
        }
        return { user: localRes.user, token: `jwt-token-${localRes.user.id}-${Date.now()}` };
      }
    },
    getCurrentUser: async (): Promise<User | null> => {
      return db.getCurrentUser();
    },
    logout: async (): Promise<void> => {
      db.setCurrentUser(null);
    },
    updateProfile: async (
      userId: string,
      profile: { name: string; email: string; phone?: string; avatar?: string }
    ): Promise<User> => {
      try {
        const updated = await request<User>('/api/auth/profile', {
          method: 'POST',
          body: JSON.stringify({ userId, ...profile }),
        });
        db.setCurrentUser(updated);
        return updated;
      } catch (err) {
        return db.updateUser(userId, profile);
      }
    },
    changePassword: async (userId: string, currentPass: string, newPass: string): Promise<void> => {
      try {
        await request<{ success: boolean }>('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ userId, currentPass, newPass }),
        });
      } catch (err) {
        const res = db.changePassword(userId, currentPass, newPass);
        if (!res.success) {
          throw new Error(res.error || 'Failed to change password');
        }
      }
    },
    resetPassword: async (userId: string, newPass: string): Promise<void> => {
      try {
        await request<{ success: boolean }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ userId, newPass }),
        });
      } catch (err) {
        const res = db.resetPassword(userId, newPass);
        if (!res.success) {
          throw new Error(res.error || 'Failed to reset password');
        }
      }
    },
    resetPasswordByEmail: async (email: string, newPass: string): Promise<User> => {
      try {
        return await request<User>('/api/auth/reset-by-email', {
          method: 'POST',
          body: JSON.stringify({ email, newPass }),
        });
      } catch (err) {
        const res = db.resetPasswordByEmail(email, newPass);
        if (!res.success || !res.user) {
          throw err;
        }
        return res.user;
      }
    },
  },

  // --- Invoices APIs ---
  invoices: {
    getAll: async (): Promise<Invoice[]> => {
      try {
        return await request<Invoice[]>('/api/invoices');
      } catch (err) {
        return db.getInvoices();
      }
    },
    getById: async (id: string): Promise<Invoice> => {
      try {
        return await request<Invoice>(`/api/invoices/${id}`);
      } catch (err) {
        const inv = db.getInvoiceById(id);
        if (!inv) throw new Error('Invoice not found');
        return inv;
      }
    },
    create: async (data: Parameters<typeof db.createInvoice>[0]): Promise<Invoice> => {
      try {
        const created = await request<Invoice>('/api/invoices', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        // Keep local cache synced
        db.createInvoice(created);
        return created;
      } catch (err) {
        return db.createInvoice(data);
      }
    },
    getNextInvoiceNumber: async (): Promise<string> => {
      try {
        const res = await request<{ nextInvoiceNumber: string }>('/api/invoices/next-number');
        return res.nextInvoiceNumber;
      } catch (err) {
        return db.generateNextInvoiceNumber();
      }
    },
    resetSalesData: async (): Promise<Invoice[]> => {
      try {
        const res = await request<Invoice[]>('/api/invoices/reset-sales', {
          method: 'POST',
        });
        db.resetSalesData();
        return res;
      } catch (err) {
        return db.resetSalesData();
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await request<{ success: boolean }>(`/api/invoices/${id}`, {
          method: 'DELETE',
        });
        db.deleteInvoice(id);
        return true;
      } catch (err) {
        return db.deleteInvoice(id);
      }
    },
    deleteMultiple: async (ids: string[]): Promise<boolean> => {
      try {
        await request<{ success: boolean; count: number }>('/api/invoices/delete-multiple', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });
        db.deleteInvoices(ids);
        return true;
      } catch (err) {
        return db.deleteInvoices(ids);
      }
    },
  },

  // --- Dashboard APIs ---
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      try {
        return await request<DashboardStats>('/api/dashboard/stats');
      } catch (err) {
        return db.getDashboardStats();
      }
    },
    getDailySales: async () => {
      try {
        const res = await request<any[]>('/api/dashboard/daily-sales');
        return Array.isArray(res) ? res : db.getDailySalesChartData();
      } catch (err) {
        return db.getDailySalesChartData();
      }
    },
    getMonthlySales: async () => {
      try {
        const res = await request<any[]>('/api/dashboard/monthly-sales');
        return Array.isArray(res) ? res : db.getMonthlySalesChartData();
      } catch (err) {
        return db.getMonthlySalesChartData();
      }
    },
    getRecentInvoices: async (limit: number = 6): Promise<Invoice[]> => {
      try {
        const invoices = await request<Invoice[]>('/api/invoices');
        return invoices.slice(0, limit);
      } catch (err) {
        return db.getInvoices().slice(0, limit);
      }
    },
  },

  // --- Reports APIs ---
  reports: {
    getSummary: async (range: string = 'all', startDate?: string, endDate?: string): Promise<ReportsSummary> => {
      try {
        const params = new URLSearchParams();
        if (range) params.set('range', range);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        return await request<ReportsSummary>(`/api/reports/summary?${params.toString()}`);
      } catch (err) {
        const invoices = db.getInvoices();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentYear = now.getFullYear();
        const currentYearPrefix = `${currentYear}-`;
        const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let filtered = invoices;
        if (range === 'today') {
          filtered = invoices.filter(inv => inv.date === todayStr);
        } else if (range === 'week') {
          filtered = invoices.filter(inv => inv.date >= sevenDaysAgoStr && inv.date <= todayStr);
        } else if (range === 'month') {
          filtered = invoices.filter(inv => inv.date.startsWith(currentMonthPrefix));
        } else if (range === 'year') {
          filtered = invoices.filter(inv => inv.date.startsWith(currentYearPrefix));
        } else if (range === 'custom') {
          filtered = invoices.filter(inv => {
            if (startDate && inv.date < startDate) return false;
            if (endDate && inv.date > endDate) return false;
            return true;
          });
        }

        const totalRevenue = filtered.reduce((acc, inv) => acc + inv.grandTotal, 0);
        const totalBills = filtered.length;

        const todaySales = invoices
          .filter(inv => inv.date === todayStr)
          .reduce((acc, inv) => acc + inv.grandTotal, 0);

        const weeklySales = invoices
          .filter(inv => inv.date >= sevenDaysAgoStr && inv.date <= todayStr)
          .reduce((acc, inv) => acc + inv.grandTotal, 0);

        const monthlySales = invoices
          .filter(inv => inv.date.startsWith(currentMonthPrefix))
          .reduce((acc, inv) => acc + inv.grandTotal, 0);

        const yearlySales = invoices
          .filter(inv => inv.date.startsWith(currentYearPrefix))
          .reduce((acc, inv) => acc + inv.grandTotal, 0);

        return {
          todaySales: Number(todaySales.toFixed(2)),
          weeklySales: Number(weeklySales.toFixed(2)),
          monthlySales: Number(monthlySales.toFixed(2)),
          yearlySales: Number(yearlySales.toFixed(2)),
          totalBills,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          filteredInvoices: filtered,
        };
      }
    },
    resetSalesData: async (): Promise<Invoice[]> => {
      try {
        const res = await request<Invoice[]>('/api/invoices/reset-sales', {
          method: 'POST',
        });
        db.resetSalesData();
        return res;
      } catch (err) {
        return db.resetSalesData();
      }
    },
    getDailySales: async () => {
      try {
        const res = await request<any[]>('/api/dashboard/daily-sales');
        return Array.isArray(res) ? res : db.getDailySalesChartData();
      } catch (err) {
        return db.getDailySalesChartData();
      }
    },
    getMonthlySales: async () => {
      try {
        const res = await request<any[]>('/api/dashboard/monthly-sales');
        return Array.isArray(res) ? res : db.getMonthlySalesChartData();
      } catch (err) {
        return db.getMonthlySalesChartData();
      }
    },
    getPaymentSummary: async () => {
      try {
        const res = await request<any>('/api/reports/payment-summary');
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'object') {
          const totalAll = Object.values(res).reduce((acc: number, cur: any) => acc + (cur.amount || cur.total || 0), 0);
          return Object.entries(res).map(([method, val]: [string, any]) => ({
            method,
            total: Number((val.amount ?? val.total ?? 0).toFixed(2)),
            count: val.count || 0,
            percentage: totalAll > 0 ? Number((((val.amount ?? val.total ?? 0) / totalAll) * 100).toFixed(1)) : 0,
          }));
        }
        return db.getPaymentMethodSummary();
      } catch (err) {
        return db.getPaymentMethodSummary();
      }
    },
  },

  // --- Users APIs ---
  users: {
    getAll: async (): Promise<User[]> => {
      try {
        return await request<User[]>('/api/users');
      } catch (err) {
        return db.getUsers();
      }
    },
    create: async (data: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
      try {
        const created = await request<User>('/api/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        db.addUser(created);
        return created;
      } catch (err) {
        return db.addUser(data);
      }
    },
    update: async (id: string, updates: Partial<User>): Promise<User> => {
      try {
        const updated = await request<User>(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        db.updateUser(id, updates);
        return updated;
      } catch (err) {
        return db.updateUser(id, updates);
      }
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await request<{ success: boolean }>(`/api/users/${id}`, {
          method: 'DELETE',
        });
        db.deleteUser(id);
        return { success: true };
      } catch (err) {
        db.deleteUser(id);
        return { success: true };
      }
    },
  },

  // --- Settings APIs ---
  settings: {
    get: async (): Promise<BusinessSettings> => {
      try {
        return await request<BusinessSettings>('/api/settings');
      } catch (err) {
        return db.getSettings();
      }
    },
    update: async (updates: Partial<BusinessSettings>): Promise<BusinessSettings> => {
      try {
        const updated = await request<BusinessSettings>('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        db.updateSettings(updates);
        return updated;
      } catch (err) {
        return db.updateSettings(updates);
      }
    },
    resetToFactory: async (): Promise<void> => {
      try {
        await request<BusinessSettings>('/api/settings/reset', {
          method: 'POST',
        });
        db.resetToFactory();
      } catch (err) {
        db.resetToFactory();
      }
    },
  },
};
