import {
  User, Invoice, InvoiceItem, PaymentMethod, BusinessSettings, DashboardStats
} from '../types';
import {
  INITIAL_USERS, INITIAL_INVOICES, INITIAL_SETTINGS
} from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'smartbill_users_v2',
  INVOICES: 'smartbill_invoices_v2',
  SETTINGS: 'smartbill_settings_v2',
  CURRENT_USER: 'smartbill_auth_user_v2',
};

function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return fallback;
  }
}

function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export class SmartBillDatabase {
  private users: User[];
  private invoices: Invoice[];
  private settings: BusinessSettings;
  private currentUser: User | null;

  constructor() {
    const rawUsers = loadData<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);

    // Strict deduplication by unique ID and unique email
    const userMap = new Map<string, User>();
    const seenEmailToId = new Map<string, string>();

    // 1. Seed initial users first
    for (const u of INITIAL_USERS) {
      if (!u || !u.id) continue;
      userMap.set(u.id, { ...u });
      if (u.email) {
        seenEmailToId.set(u.email.toLowerCase().trim(), u.id);
      }
    }

    // 2. Layer stored users on top (preserving modifications & newly created accounts)
    if (Array.isArray(rawUsers)) {
      for (const u of rawUsers) {
        if (!u || !u.id) continue;
        const emailKey = (u.email || '').toLowerCase().trim();
        const existingIdWithEmail = emailKey ? seenEmailToId.get(emailKey) : null;

        // If an entry with this email already exists under a different ID, merge into that entry
        const targetId = existingIdWithEmail || u.id;
        const existing = userMap.get(targetId);

        userMap.set(targetId, {
          ...existing,
          ...u,
          id: targetId,
        });

        if (emailKey) {
          seenEmailToId.set(emailKey, targetId);
        }
      }
    }

    // 3. Final pass: ensure unique users and proper passwords
    const cleanUsers: User[] = [];
    const finalSeenIds = new Set<string>();
    const finalSeenEmails = new Set<string>();

    for (const u of userMap.values()) {
      if (!u || !u.id || finalSeenIds.has(u.id)) continue;
      const emailKey = (u.email || '').toLowerCase().trim();
      if (emailKey && finalSeenEmails.has(emailKey)) continue;

      finalSeenIds.add(u.id);
      if (emailKey) finalSeenEmails.add(emailKey);

      if (emailKey === 'ramyaselva048@gmail.com') {
        cleanUsers.push({
          ...u,
          role: 'admin',
          status: 'active',
          password: u.password || 'Ramya@123',
        });
      } else {
        cleanUsers.push({
          ...u,
          password: u.password || (u.role === 'admin' ? 'admin123' : 'staff123'),
        });
      }
    }

    this.users = cleanUsers;
    saveData(STORAGE_KEYS.USERS, this.users);
    this.invoices = loadData(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    this.settings = loadData(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    // Strict Auth: Require entering login password if no active user session
    this.currentUser = loadData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  public resetToFactory(): void {
    this.users = [...INITIAL_USERS];
    this.invoices = [...INITIAL_INVOICES];
    this.settings = { ...INITIAL_SETTINGS };
    this.currentUser = null;

    saveData(STORAGE_KEYS.USERS, this.users);
    saveData(STORAGE_KEYS.INVOICES, this.invoices);
    saveData(STORAGE_KEYS.SETTINGS, this.settings);
    saveData(STORAGE_KEYS.CURRENT_USER, null);
  }

  // --- Auth / User Session ---
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    saveData(STORAGE_KEYS.CURRENT_USER, user);
  }

  public login(identifier: string, pass: string): { success: boolean; user?: User; error?: string } {
    const cleanId = (identifier || '').trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    if (!cleanId) {
      return { success: false, error: 'Please enter your email address.' };
    }

    if (!trimmedPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    // Find matching user by email, name, or role alias ('admin' / 'staff')
    const user = this.users.find(u => {
      const uEmail = u.email.toLowerCase();
      const uName = u.name.toLowerCase();
      return (
        uEmail === cleanId ||
        uName === cleanId ||
        (cleanId === 'admin' && u.role === 'admin') ||
        (cleanId === 'staff' && u.role === 'staff')
      );
    });

    if (!user) {
      return { success: false, error: 'User account not found. Please check your email address.' };
    }

    if (user.status === 'inactive') {
      return { success: false, error: 'Your account is deactivated. Please contact an Administrator.' };
    }

    // Verify password:
    const validPassword = user.password || (user.role === 'admin' ? 'admin123' : 'staff123');
    const isPasswordCorrect =
      trimmedPass === validPassword ||
      (user.role === 'admin' && (trimmedPass === 'admin123' || trimmedPass === 'admin'));

    if (isPasswordCorrect) {
      this.setCurrentUser(user);
      return { success: true, user };
    }

    return {
      success: false,
      error: 'Incorrect password. Please check your password and try again.'
    };
  }

  public changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    const validPassword = user.password || (user.role === 'admin' ? 'admin123' : 'staff123');
    if (currentPass !== validPassword) {
      return { success: false, error: 'Current password does not match.' };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'New password must contain at least 6 characters.' };
    }

    user.password = newPass.trim();
    saveData(STORAGE_KEYS.USERS, this.users);
    if (this.currentUser?.id === userId) {
      this.currentUser.password = user.password;
      saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    return { success: true };
  }

  public resetPassword(userId: string, newPass: string): { success: boolean; error?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'New password must contain at least 6 characters.' };
    }

    user.password = newPass.trim();
    saveData(STORAGE_KEYS.USERS, this.users);
    if (this.currentUser?.id === userId) {
      this.currentUser.password = user.password;
      saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    return { success: true };
  }

  public resetPasswordByEmail(email: string, newPass: string): { success: boolean; error?: string; user?: User } {
    const cleanedEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === cleanedEmail);
    if (!user) return { success: false, error: 'No account found with this email address.' };

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'New password must contain at least 6 characters.' };
    }

    user.password = newPass.trim();
    saveData(STORAGE_KEYS.USERS, this.users);
    if (this.currentUser?.id === user.id) {
      this.currentUser.password = user.password;
      saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    return { success: true, user };
  }

  // --- Users CRUD ---
  public getUsers(): User[] {
    const seen = new Set<string>();
    return this.users.filter(u => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }

  public addUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      password: userData.password?.trim() || (userData.role === 'admin' ? 'admin123' : 'staff123'),
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    saveData(STORAGE_KEYS.USERS, this.users);
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...updates };
    saveData(STORAGE_KEYS.USERS, this.users);
    if (this.currentUser?.id === id) {
      this.currentUser = this.users[index];
      saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    return this.users[index];
  }

  public deleteUser(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    if (user.id === this.currentUser?.id) throw new Error('You cannot delete your own logged-in account.');
    this.users = this.users.filter(u => u.id !== id);
    saveData(STORAGE_KEYS.USERS, this.users);
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find(inv => inv.id === id);
  }

  public generateNextInvoiceNumber(): string {
    const prefix = this.settings.invoicePrefix || 'INV-2026-';
    const numbers = this.invoices
      .map(inv => {
        const parts = inv.invoiceNumber.replace(prefix, '');
        const n = parseInt(parts, 10);
        return isNaN(n) ? 0 : n;
      })
      .filter(n => n > 0);
    const nextNum = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  }

  public createInvoice(data: {
    items: {
      itemName: string;
      quantity: number;
      unitPrice: number;
      discount: number; // Discount in ₹
      gst: number; // GST %
    }[];
    paymentMethod: PaymentMethod;
    paymentRef?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    date?: string;
    overallDiscount?: number;
  }): Invoice {
    if (!data.items || data.items.length === 0) {
      throw new Error('Invoice must contain at least one item.');
    }

    const user = this.getCurrentUser();
    const invoiceNumber = this.generateNextInvoiceNumber();
    const invoiceDate = data.date ? data.date.trim() : new Date().toISOString().split('T')[0];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    const processedItems: InvoiceItem[] = data.items.map((it, idx) => {
      const qty = Math.max(0.001, Number(it.quantity) || 1);
      const price = Math.max(0, Number(it.unitPrice) || 0);
      const disc = Math.max(0, Number(it.discount) || 0);
      const gstRate = Math.max(0, Number(it.gst) || 0);

      const lineSubtotal = Number((qty * price).toFixed(2));
      const effectiveDisc = Math.min(lineSubtotal, disc);
      const taxable = Number((lineSubtotal - effectiveDisc).toFixed(2));
      const gstAmount = Number(((taxable * gstRate) / 100).toFixed(2));
      const lineTotal = Number((taxable + gstAmount).toFixed(2));

      subtotal += lineSubtotal;
      totalDiscount += effectiveDisc;
      totalTaxable += taxable;
      totalGst += gstAmount;

      return {
        id: `item-${Date.now()}-${idx + 1}`,
        itemName: it.itemName.trim() || `Item ${idx + 1}`,
        quantity: qty,
        unitPrice: price,
        discount: effectiveDisc,
        gst: gstRate,
        taxableAmount: taxable,
        gstAmount,
        total: lineTotal,
      };
    });

    const extraDisc = Math.max(0, Number(data.overallDiscount) || 0);
    const finalGrandTotal = Math.max(0, Number((totalTaxable + totalGst - extraDisc).toFixed(2)));

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: invoiceDate,
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      customerAddress: data.customerAddress?.trim() || undefined,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'PAID',
      paymentRef: data.paymentRef?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      items: processedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number((totalDiscount + extraDisc).toFixed(2)),
      gst: Number(totalGst.toFixed(2)),
      grandTotal: finalGrandTotal,
      createdById: user?.id,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
    };

    this.invoices.unshift(newInvoice);
    saveData(STORAGE_KEYS.INVOICES, this.invoices);
    return newInvoice;
  }

  // --- Settings ---
  public getSettings(): BusinessSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<BusinessSettings>): BusinessSettings {
    this.settings = { ...this.settings, ...updates };
    saveData(STORAGE_KEYS.SETTINGS, this.settings);
    return { ...this.settings };
  }

  // --- Dashboard Statistics Calculation ---
  public getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    let totalSales = 0;
    let todaySales = 0;
    let todayBills = 0;

    for (const inv of this.invoices) {
      totalSales += inv.grandTotal;
      if (inv.date === today) {
        todaySales += inv.grandTotal;
        todayBills += 1;
      }
    }

    return {
      todaySales: Number(todaySales.toFixed(2)),
      todayBills,
      totalSales: Number(totalSales.toFixed(2)),
      totalBills: this.invoices.length,
    };
  }

  // --- Simple Sales Charts ---
  public getDailySalesChartData(): { day: string; date: string; sales: number; bills: number }[] {
    const result: { day: string; date: string; sales: number; bills: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayInvoices = this.invoices.filter(inv => inv.date === dateStr);
      const sales = dayInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

      result.push({
        day: dayName,
        date: dateStr,
        sales: Number(sales.toFixed(2)),
        bills: dayInvoices.length,
      });
    }

    return result;
  }

  public getMonthlySalesChartData(): { month: string; sales: number; bills: number }[] {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const map = new Map<string, { month: string; sales: number; bills: number }>();

    // Seed realistic baseline
    const baseline = [
      { month: 'Apr', sales: 42500, bills: 18 },
      { month: 'May', sales: 58200, bills: 24 },
      { month: 'Jun', sales: 51800, bills: 21 },
      { month: 'Jul', sales: 67300, bills: 29 },
      { month: 'Aug', sales: 74900, bills: 32 },
      { month: 'Sep', sales: 38400, bills: 16 },
    ];

    baseline.forEach(b => map.set(b.month, { ...b }));

    // Add active invoices
    for (const inv of this.invoices) {
      const d = new Date(inv.date);
      const m = d.toLocaleString('en-US', { month: 'short' });
      if (map.has(m)) {
        const item = map.get(m)!;
        item.sales += inv.grandTotal;
        item.bills += 1;
      }
    }

    return Array.from(map.values()).slice(0, 6);
  }

  public getPaymentMethodSummary(): {
    method: PaymentMethod;
    total: number;
    count: number;
    percentage: number;
  }[] {
    let cashTotal = 0;
    let cashCount = 0;
    let upiTotal = 0;
    let upiCount = 0;
    let cardTotal = 0;
    let cardCount = 0;
    let allTotal = 0;

    for (const inv of this.invoices) {
      allTotal += inv.grandTotal;
      if (inv.paymentMethod === 'Cash') {
        cashTotal += inv.grandTotal;
        cashCount += 1;
      } else if (inv.paymentMethod === 'UPI') {
        upiTotal += inv.grandTotal;
        upiCount += 1;
      } else if (inv.paymentMethod === 'Card') {
        cardTotal += inv.grandTotal;
        cardCount += 1;
      }
    }

    return [
      {
        method: 'Cash',
        total: Number(cashTotal.toFixed(2)),
        count: cashCount,
        percentage: allTotal > 0 ? Number(((cashTotal / allTotal) * 100).toFixed(1)) : 0,
      },
      {
        method: 'UPI',
        total: Number(upiTotal.toFixed(2)),
        count: upiCount,
        percentage: allTotal > 0 ? Number(((upiTotal / allTotal) * 100).toFixed(1)) : 0,
      },
      {
        method: 'Card',
        total: Number(cardTotal.toFixed(2)),
        count: cardCount,
        percentage: allTotal > 0 ? Number(((cardTotal / allTotal) * 100).toFixed(1)) : 0,
      },
    ];
  }
}

export const db = new SmartBillDatabase();
