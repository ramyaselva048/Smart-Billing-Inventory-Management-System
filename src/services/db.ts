import {
  User, Category, Product, Customer, Invoice, Payment, StockTransaction,
  Notification, BusinessSettings, AuditLog, DashboardStats
} from '../types';
import {
  INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_CUSTOMERS,
  INITIAL_INVOICES, INITIAL_PAYMENTS, INITIAL_STOCK_TRANSACTIONS,
  INITIAL_NOTIFICATIONS, INITIAL_SETTINGS, INITIAL_AUDIT_LOGS
} from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'smartbill_users_v1',
  CATEGORIES: 'smartbill_categories_v1',
  PRODUCTS: 'smartbill_products_v1',
  CUSTOMERS: 'smartbill_customers_v1',
  INVOICES: 'smartbill_invoices_v1',
  PAYMENTS: 'smartbill_payments_v1',
  STOCK_TXNS: 'smartbill_stock_txns_v1',
  NOTIFICATIONS: 'smartbill_notifications_v1',
  SETTINGS: 'smartbill_settings_v1',
  AUDIT_LOGS: 'smartbill_audit_logs_v1',
  CURRENT_USER: 'smartbill_auth_user_v1',
};

// Safe JSON fetch with fallback
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
  private categories: Category[];
  private products: Product[];
  private customers: Customer[];
  private invoices: Invoice[];
  private payments: Payment[];
  private stockTransactions: StockTransaction[];
  private notifications: Notification[];
  private settings: BusinessSettings;
  private auditLogs: AuditLog[];
  private currentUser: User | null;

  constructor() {
    this.users = loadData(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.categories = loadData(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    this.products = loadData(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.customers = loadData(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    this.invoices = loadData(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    this.payments = loadData(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    this.stockTransactions = loadData(STORAGE_KEYS.STOCK_TXNS, INITIAL_STOCK_TRANSACTIONS);
    this.notifications = loadData(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    this.settings = loadData(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    this.auditLogs = loadData(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.currentUser = loadData(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]); // Default to admin
  }

  // Reset to factory defaults
  public resetToFactory(): void {
    this.users = [...INITIAL_USERS];
    this.categories = [...INITIAL_CATEGORIES];
    this.products = [...INITIAL_PRODUCTS];
    this.customers = [...INITIAL_CUSTOMERS];
    this.invoices = [...INITIAL_INVOICES];
    this.payments = [...INITIAL_PAYMENTS];
    this.stockTransactions = [...INITIAL_STOCK_TRANSACTIONS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.settings = { ...INITIAL_SETTINGS };
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.currentUser = INITIAL_USERS[0];

    saveData(STORAGE_KEYS.USERS, this.users);
    saveData(STORAGE_KEYS.CATEGORIES, this.categories);
    saveData(STORAGE_KEYS.PRODUCTS, this.products);
    saveData(STORAGE_KEYS.CUSTOMERS, this.customers);
    saveData(STORAGE_KEYS.INVOICES, this.invoices);
    saveData(STORAGE_KEYS.PAYMENTS, this.payments);
    saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    saveData(STORAGE_KEYS.SETTINGS, this.settings);
    saveData(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);

    this.logAudit('Reset Database', 'settings', 'System restored to initial sample data and configuration.');
  }

  // --- Audit Logs ---
  public logAudit(action: string, module: AuditLog['module'], description: string): void {
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || 'sys',
      userName: user?.name || 'System User',
      role: user?.role || 'staff',
      action,
      module,
      description,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    saveData(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // --- Auth / User Session ---
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    saveData(STORAGE_KEYS.CURRENT_USER, user);
    if (user) {
      this.logAudit('User Login', 'auth', `${user.name} logged into the system as ${user.role}.`);
    } else {
      this.logAudit('User Logout', 'auth', 'User logged out.');
    }
  }

  public login(email: string, pass: string): { success: boolean; user?: User; error?: string } {
    const cleanedEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === cleanedEmail);
    if (!user) {
      return { success: false, error: 'Invalid email or user not found' };
    }
    if (user.status === 'inactive') {
      return { success: false, error: 'Your account is deactivated. Please contact an Administrator.' };
    }
    // Accept standard demo passwords or any 6+ char for flexible testing
    if (pass === 'admin123' || pass === 'staff123' || pass.length >= 6) {
      this.setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Incorrect password. (Try admin123 or staff123)' };
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public addUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    saveData(STORAGE_KEYS.USERS, this.users);
    this.logAudit('User Created', 'user', `Added new user ${newUser.name} with role ${newUser.role}.`);
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...updates };
    saveData(STORAGE_KEYS.USERS, this.users);
    this.logAudit('User Updated', 'user', `Updated user details for ${this.users[index].name}.`);
    if (this.currentUser?.id === id) {
      this.currentUser = this.users[index];
      saveData(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    return this.users[index];
  }

  public deleteUser(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    if (user.id === this.currentUser?.id) throw new Error('You cannot delete your own logged-in account');
    this.users = this.users.filter(u => u.id !== id);
    saveData(STORAGE_KEYS.USERS, this.users);
    this.logAudit('User Deleted', 'user', `Deleted user account: ${user.name} (${user.email}).`);
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return [...this.categories];
  }

  public addCategory(cat: Omit<Category, 'id' | 'createdAt'>): Category {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.categories.push(newCat);
    saveData(STORAGE_KEYS.CATEGORIES, this.categories);
    this.logAudit('Category Created', 'category', `Added category: ${newCat.name}.`);
    return newCat;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    const oldName = this.categories[index].name;
    this.categories[index] = { ...this.categories[index], ...updates };
    saveData(STORAGE_KEYS.CATEGORIES, this.categories);

    // If category name changed, update product categoryName too
    if (updates.name && updates.name !== oldName) {
      this.products = this.products.map(p =>
        p.categoryId === id ? { ...p, categoryName: updates.name! } : p
      );
      saveData(STORAGE_KEYS.PRODUCTS, this.products);
    }
    this.logAudit('Category Updated', 'category', `Updated category: ${this.categories[index].name}.`);
    return this.categories[index];
  }

  public deleteCategory(id: string): void {
    const cat = this.categories.find(c => c.id === id);
    if (!cat) throw new Error('Category not found');
    const hasProducts = this.products.some(p => p.categoryId === id);
    if (hasProducts) {
      throw new Error(`Cannot delete "${cat.name}" because it still contains active products. Reassign them first.`);
    }
    this.categories = this.categories.filter(c => c.id !== id);
    saveData(STORAGE_KEYS.CATEGORIES, this.categories);
    this.logAudit('Category Deleted', 'category', `Deleted category: ${cat.name}.`);
  }

  // --- Products ---
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  public addProduct(productData: Omit<Product, 'id' | 'createdAt'>): Product {
    const exists = this.products.find(p => p.sku.toLowerCase() === productData.sku.toLowerCase());
    if (exists) throw new Error(`A product with SKU "${productData.sku}" already exists.`);

    const newProduct: Product = {
      ...productData,
      id: `prd-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.products.unshift(newProduct);
    saveData(STORAGE_KEYS.PRODUCTS, this.products);

    // Record initial stock transaction if stock > 0
    if (newProduct.stock > 0) {
      const user = this.getCurrentUser();
      const txn: StockTransaction = {
        id: `st-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'IN',
        quantity: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'Opening stock on product creation',
        createdById: user?.id || 'sys',
        createdByName: user?.name || 'Staff',
        createdAt: new Date().toISOString(),
      };
      this.stockTransactions.unshift(txn);
      saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);
    }

    this.checkStockAlerts(newProduct);
    this.logAudit('Product Created', 'product', `Added product: ${newProduct.name} (SKU: ${newProduct.sku}, Stock: ${newProduct.stock}).`);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');

    if (updates.sku) {
      const duplicate = this.products.find(p => p.id !== id && p.sku.toLowerCase() === updates.sku!.toLowerCase());
      if (duplicate) throw new Error(`Another product already uses SKU "${updates.sku}".`);
    }

    const prevProduct = this.products[index];
    this.products[index] = { ...prevProduct, ...updates };
    saveData(STORAGE_KEYS.PRODUCTS, this.products);

    this.checkStockAlerts(this.products[index]);
    this.logAudit('Product Updated', 'product', `Updated product: ${this.products[index].name} (SKU: ${this.products[index].sku}).`);
    return this.products[index];
  }

  public deleteProduct(id: string): void {
    const product = this.products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    this.products = this.products.filter(p => p.id !== id);
    saveData(STORAGE_KEYS.PRODUCTS, this.products);
    this.logAudit('Product Deleted', 'product', `Deleted product: ${product.name} (SKU: ${product.sku}).`);
  }

  private checkStockAlerts(product: Product): void {
    if (product.stock === 0) {
      this.addNotification({
        title: 'Out of Stock Alert',
        message: `${product.name} (${product.sku}) has reached 0 stock! Immediate restock required.`,
        type: 'out_of_stock',
        linkTab: 'inventory',
      });
    } else if (product.stock <= product.minStock) {
      this.addNotification({
        title: 'Low Stock Warning',
        message: `${product.name} is low on stock (${product.stock} ${product.unit} remaining, Min: ${product.minStock}).`,
        type: 'low_stock',
        linkTab: 'inventory',
      });
    }
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find(c => c.id === id);
  }

  public addCustomer(custData: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'outstandingAmount'>): Customer {
    const newCustomer: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      outstandingAmount: 0,
      createdAt: new Date().toISOString(),
    };
    this.customers.push(newCustomer);
    saveData(STORAGE_KEYS.CUSTOMERS, this.customers);
    this.logAudit('Customer Created', 'customer', `Added customer: ${newCustomer.name} (${newCustomer.phone}).`);
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    this.customers[index] = { ...this.customers[index], ...updates };
    saveData(STORAGE_KEYS.CUSTOMERS, this.customers);
    this.logAudit('Customer Updated', 'customer', `Updated customer details for ${this.customers[index].name}.`);
    return this.customers[index];
  }

  public deleteCustomer(id: string): void {
    const customer = this.customers.find(c => c.id === id);
    if (!customer) throw new Error('Customer not found');
    if (customer.outstandingAmount > 0) {
      throw new Error(`Cannot delete customer "${customer.name}" with unpaid outstanding balance of ${this.settings.currencySymbol}${customer.outstandingAmount.toFixed(2)}.`);
    }
    this.customers = this.customers.filter(c => c.id !== id);
    saveData(STORAGE_KEYS.CUSTOMERS, this.customers);
    this.logAudit('Customer Deleted', 'customer', `Deleted customer: ${customer.name}.`);
  }

  // --- Billing & Invoices ---
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

  public createInvoice(invoiceData: {
    customerId: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
    }[];
    paymentMethod: Invoice['paymentMethod'];
    paidAmount: number;
    notes?: string;
    dueDate?: string;
  }): Invoice {
    const user = this.getCurrentUser();
    const customer = this.getCustomerById(invoiceData.customerId);
    if (!customer) throw new Error('Selected customer not found');
    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('Invoice must have at least one product line item');
    }

    // Step 1: Stock verification
    for (const item of invoiceData.items) {
      const product = this.getProductById(item.productId);
      if (!product) throw new Error(`Product ID ${item.productId} not found`);
      if (item.quantity <= 0) throw new Error(`Quantity for ${product.name} must be greater than 0`);
      if (item.quantity > product.stock) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}, Requested: ${item.quantity} ${product.unit}.`);
      }
    }

    // Step 2: Build Line Items & Calculations
    const processedItems: Invoice['items'] = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const isInterState = customer.state && this.settings.state &&
      customer.state.trim().toLowerCase() !== this.settings.state.trim().toLowerCase();

    for (const line of invoiceData.items) {
      const product = this.getProductById(line.productId)!;
      const lineSubtotal = line.quantity * line.unitPrice;
      const discountAmount = Number(((lineSubtotal * (line.discountPercent || 0)) / 100).toFixed(2));
      const lineTaxable = Number((lineSubtotal - discountAmount).toFixed(2));

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = Number(((lineTaxable * product.gstRate) / 100).toFixed(2));
      } else {
        const halfRate = product.gstRate / 2;
        cgst = Number(((lineTaxable * halfRate) / 100).toFixed(2));
        sgst = Number(((lineTaxable * halfRate) / 100).toFixed(2));
      }

      const lineTotal = Number((lineTaxable + cgst + sgst + igst).toFixed(2));

      subtotal += lineSubtotal;
      totalDiscount += discountAmount;
      taxableAmount += lineTaxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      processedItems.push({
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent || 0,
        discountAmount,
        taxableAmount: lineTaxable,
        gstRate: product.gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
      });
    }

    const grandTotal = Number((taxableAmount + totalCgst + totalSgst + totalIgst).toFixed(2));
    const paidAmount = Number(Math.min(invoiceData.paidAmount, grandTotal).toFixed(2));
    const balanceAmount = Number(Math.max(0, grandTotal - paidAmount).toFixed(2));

    let paymentStatus: Invoice['paymentStatus'] = 'Pending';
    if (balanceAmount === 0 && grandTotal > 0) {
      paymentStatus = 'Paid';
    } else if (paidAmount > 0 && balanceAmount > 0) {
      paymentStatus = 'Partial';
    }

    const invoiceNumber = this.generateNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: today,
      dueDate: invoiceData.dueDate || today,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: `${customer.address}, ${customer.city}, ${customer.state}`,
      customerGstin: customer.gstin,
      items: processedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      grandTotal,
      paidAmount,
      balanceAmount,
      paymentMethod: invoiceData.paymentMethod,
      paymentStatus,
      status: 'active',
      notes: invoiceData.notes || '',
      createdById: user?.id || 'usr-1',
      createdByName: user?.name || 'Staff User',
      createdAt: new Date().toISOString(),
    };

    // Step 3: Deduct product stocks & write stock transaction history
    for (const item of processedItems) {
      const product = this.getProductById(item.productId)!;
      const prevStock = product.stock;
      const newStock = prevStock - item.quantity;
      product.stock = newStock;

      const stTxn: StockTransaction = {
        id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'OUT',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock,
        reason: `Sold in Invoice ${invoiceNumber}`,
        invoiceNumber,
        createdById: user?.id || 'usr-1',
        createdByName: user?.name || 'Staff User',
        createdAt: new Date().toISOString(),
      };
      this.stockTransactions.unshift(stTxn);
      this.checkStockAlerts(product);
    }
    saveData(STORAGE_KEYS.PRODUCTS, this.products);
    saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);

    // Step 4: Record Payment if paidAmount > 0
    if (paidAmount > 0) {
      const payment: Payment = {
        id: `pay-${Date.now()}`,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        amount: paidAmount,
        paymentMethod: invoiceData.paymentMethod,
        paymentDate: new Date().toISOString(),
        referenceNumber: `RCPT-${newInvoice.invoiceNumber.replace(/[^0-9]/g, '')}`,
        notes: `Initial payment on billing for ${newInvoice.invoiceNumber}`,
        status: 'Completed',
        recordedBy: user?.name || 'Staff',
      };
      this.payments.unshift(payment);
      saveData(STORAGE_KEYS.PAYMENTS, this.payments);
    }

    // Step 5: Update Customer statistics
    customer.totalPurchases = Number((customer.totalPurchases + grandTotal).toFixed(2));
    customer.outstandingAmount = Number((customer.outstandingAmount + balanceAmount).toFixed(2));
    this.updateCustomer(customer.id, customer);

    // Save invoice
    this.invoices.unshift(newInvoice);
    saveData(STORAGE_KEYS.INVOICES, this.invoices);

    this.addNotification({
      title: 'Invoice Created',
      message: `Invoice ${invoiceNumber} created for ${customer.name} (Amount: ${this.settings.currencySymbol}${grandTotal.toFixed(2)}).`,
      type: 'invoice_created',
      linkTab: 'invoices',
    });

    this.logAudit('Invoice Created', 'invoice', `Created invoice ${invoiceNumber} for ${customer.name} with ${processedItems.length} items. Total: ${this.settings.currencySymbol}${grandTotal.toFixed(2)}.`);

    return newInvoice;
  }

  public cancelInvoice(invoiceId: string, reason: string): Invoice {
    const index = this.invoices.findIndex(inv => inv.id === invoiceId);
    if (index === -1) throw new Error('Invoice not found');
    const invoice = this.invoices[index];

    if (invoice.status === 'cancelled') {
      throw new Error('This invoice is already cancelled');
    }

    const user = this.getCurrentUser();

    // Restore stock for all products in this invoice
    for (const item of invoice.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        const prevStock = product.stock;
        const newStock = prevStock + item.quantity;
        product.stock = newStock;

        const stTxn: StockTransaction = {
          id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'RETURN',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Restocked due to invoice cancellation: ${invoice.invoiceNumber}. Note: ${reason}`,
          invoiceNumber: invoice.invoiceNumber,
          createdById: user?.id || 'usr-1',
          createdByName: user?.name || 'Staff User',
          createdAt: new Date().toISOString(),
        };
        this.stockTransactions.unshift(stTxn);
      }
    }
    saveData(STORAGE_KEYS.PRODUCTS, this.products);
    saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);

    // Adjust customer purchases and outstanding
    const customer = this.getCustomerById(invoice.customerId);
    if (customer) {
      customer.totalPurchases = Math.max(0, Number((customer.totalPurchases - invoice.grandTotal).toFixed(2)));
      customer.outstandingAmount = Math.max(0, Number((customer.outstandingAmount - invoice.balanceAmount).toFixed(2)));
      this.updateCustomer(customer.id, customer);
    }

    invoice.status = 'cancelled';
    invoice.notes = `${invoice.notes || ''} [CANCELLED: ${reason}]`.trim();
    saveData(STORAGE_KEYS.INVOICES, this.invoices);

    this.logAudit('Invoice Cancelled', 'invoice', `Cancelled invoice ${invoice.invoiceNumber}. Restored inventory items. Reason: ${reason}`);
    return invoice;
  }

  // --- Payments ---
  public getPayments(): Payment[] {
    return [...this.payments];
  }

  public recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    referenceNumber?: string;
    notes?: string;
  }): Payment {
    const invoice = this.getInvoiceById(paymentData.invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'cancelled') throw new Error('Cannot add payment to a cancelled invoice');
    if (paymentData.amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (paymentData.amount > invoice.balanceAmount + 0.01) {
      throw new Error(`Amount cannot exceed the remaining balance due of ${this.settings.currencySymbol}${invoice.balanceAmount.toFixed(2)}`);
    }

    const user = this.getCurrentUser();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentDate: new Date().toISOString(),
      referenceNumber: paymentData.referenceNumber || `RCPT-${Date.now().toString().slice(-6)}`,
      notes: paymentData.notes || '',
      status: 'Completed',
      recordedBy: user?.name || 'Staff',
    };

    this.payments.unshift(newPayment);
    saveData(STORAGE_KEYS.PAYMENTS, this.payments);

    // Update invoice balance and status
    invoice.paidAmount = Number((invoice.paidAmount + paymentData.amount).toFixed(2));
    invoice.balanceAmount = Math.max(0, Number((invoice.grandTotal - invoice.paidAmount).toFixed(2)));
    if (invoice.balanceAmount === 0) {
      invoice.paymentStatus = 'Paid';
    } else {
      invoice.paymentStatus = 'Partial';
    }
    saveData(STORAGE_KEYS.INVOICES, this.invoices);

    // Update customer outstanding
    const customer = this.getCustomerById(invoice.customerId);
    if (customer) {
      customer.outstandingAmount = Math.max(0, Number((customer.outstandingAmount - paymentData.amount).toFixed(2)));
      this.updateCustomer(customer.id, customer);
    }

    this.logAudit('Payment Recorded', 'payment', `Recorded payment of ${this.settings.currencySymbol}${paymentData.amount.toFixed(2)} via ${paymentData.paymentMethod} for invoice ${invoice.invoiceNumber}.`);
    return newPayment;
  }

  // --- Inventory & Stock Transactions ---
  public getStockTransactions(): StockTransaction[] {
    return [...this.stockTransactions];
  }

  public stockIn(productId: string, quantity: number, reason: string): StockTransaction {
    if (quantity <= 0) throw new Error('Quantity must be greater than 0');
    const product = this.getProductById(productId);
    if (!product) throw new Error('Product not found');

    const user = this.getCurrentUser();
    const prevStock = product.stock;
    const newStock = prevStock + quantity;
    product.stock = newStock;
    saveData(STORAGE_KEYS.PRODUCTS, this.products);

    const txn: StockTransaction = {
      id: `st-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'IN',
      quantity,
      previousStock: prevStock,
      newStock,
      reason: reason || 'Stock In / Intake',
      createdById: user?.id || 'sys',
      createdByName: user?.name || 'Staff User',
      createdAt: new Date().toISOString(),
    };
    this.stockTransactions.unshift(txn);
    saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);

    this.checkStockAlerts(product);
    this.logAudit('Stock Added', 'inventory', `Stock In: Added +${quantity} ${product.unit} to ${product.name} (Now: ${newStock}). Reason: ${reason}`);
    return txn;
  }

  public stockAdjustment(productId: string, newStockLevel: number, reason: string): StockTransaction {
    if (newStockLevel < 0) throw new Error('Stock quantity cannot be negative');
    const product = this.getProductById(productId);
    if (!product) throw new Error('Product not found');

    const user = this.getCurrentUser();
    const prevStock = product.stock;
    const delta = newStockLevel - prevStock;
    if (delta === 0) throw new Error('New stock is identical to current stock. No adjustment needed.');

    product.stock = newStockLevel;
    saveData(STORAGE_KEYS.PRODUCTS, this.products);

    const txn: StockTransaction = {
      id: `st-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'ADJUSTMENT',
      quantity: delta,
      previousStock: prevStock,
      newStock: newStockLevel,
      reason: reason || 'Manual Stock Reconciliation',
      createdById: user?.id || 'sys',
      createdByName: user?.name || 'Staff User',
      createdAt: new Date().toISOString(),
    };
    this.stockTransactions.unshift(txn);
    saveData(STORAGE_KEYS.STOCK_TXNS, this.stockTransactions);

    this.checkStockAlerts(product);
    this.logAudit('Stock Adjusted', 'inventory', `Adjusted stock for ${product.name} from ${prevStock} to ${newStockLevel} ${product.unit}. Reason: ${reason}`);
    return txn;
  }

  // --- Notifications ---
  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public addNotification(notif: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    if (this.notifications.length > 50) this.notifications.pop();
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].read = true;
      saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    }
  }

  public markAllNotificationsAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  public clearAllNotifications(): void {
    this.notifications = [];
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  public clearReadNotifications(): void {
    this.notifications = this.notifications.filter(n => !n.read);
    saveData(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  // --- Business Settings ---
  public getSettings(): BusinessSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<BusinessSettings>): BusinessSettings {
    this.settings = { ...this.settings, ...updates };
    saveData(STORAGE_KEYS.SETTINGS, this.settings);
    this.logAudit('Settings Updated', 'settings', 'Updated business credentials and invoicing configuration.');
    return { ...this.settings };
  }

  // --- Dashboard Statistics Calculation ---
  public getDashboardStats(): DashboardStats {
    const activeInvoices = this.invoices.filter(inv => inv.status !== 'cancelled');
    const today = new Date().toISOString().split('T')[0];

    let totalSales = 0;
    let todaySales = 0;
    let pendingReceivables = 0;

    for (const inv of activeInvoices) {
      totalSales += inv.grandTotal;
      pendingReceivables += inv.balanceAmount;
      if (inv.date === today) {
        todaySales += inv.grandTotal;
      }
    }

    const totalProducts = this.products.length;
    const lowStockCount = this.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = this.products.filter(p => p.stock === 0).length;
    const totalCustomers = this.customers.length;
    const totalBills = activeInvoices.length;

    // Total actual collected revenue from payments
    const totalRevenue = this.payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      totalSales: Number(totalSales.toFixed(2)),
      todaySales: Number(todaySales.toFixed(2)),
      totalBills,
      totalCustomers,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      pendingReceivables: Number(pendingReceivables.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
    };
  }

  // Monthly Sales Chart Data (Last 6-12 months)
  public getMonthlySalesChartData() {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const activeInvoices = this.invoices.filter(inv => inv.status !== 'cancelled');

    // Aggregate by month
    const map = new Map<string, { month: string; sales: number; invoices: number; profit: number }>();
    months.forEach(m => {
      map.set(m, { month: m, sales: 0, invoices: 0, profit: 0 });
    });

    // Provide baseline realistic data for 2026
    const baseline = [
      { month: 'Apr', sales: 42000, invoices: 18, profit: 12500 },
      { month: 'May', sales: 58000, invoices: 24, profit: 17400 },
      { month: 'Jun', sales: 51000, invoices: 21, profit: 15300 },
      { month: 'Jul', sales: 67000, invoices: 29, profit: 20100 },
      { month: 'Aug', sales: 74000, invoices: 32, profit: 22200 },
      { month: 'Sep', sales: 34000, invoices: 15, profit: 10200 },
    ];

    baseline.forEach(b => {
      map.set(b.month, b);
    });

    // Add actual created invoices
    for (const inv of activeInvoices) {
      const date = new Date(inv.date);
      const m = date.toLocaleString('default', { month: 'short' });
      if (map.has(m)) {
        const item = map.get(m)!;
        item.sales += inv.grandTotal;
        item.invoices += 1;
        item.profit += inv.grandTotal * 0.28; // estimated ~28% margin
      }
    }

    return Array.from(map.values()).slice(0, 6);
  }

  // Category Breakdown Chart Data
  public getSalesByCategory() {
    const categoryTotals = new Map<string, number>();
    this.categories.forEach(c => categoryTotals.set(c.name, 0));

    // Default distribution for rich charts
    categoryTotals.set('Electronics & IT', 32000);
    categoryTotals.set('Grocery & Essentials', 18500);
    categoryTotals.set('Stationery & Office', 14200);
    categoryTotals.set('Clothing & Apparel', 16800);
    categoryTotals.set('Cosmetics & Wellness', 8900);
    categoryTotals.set('Hardware & Tools', 7400);

    const activeInvoices = this.invoices.filter(inv => inv.status !== 'cancelled');
    for (const inv of activeInvoices) {
      for (const item of inv.items) {
        const product = this.getProductById(item.productId);
        if (product) {
          const prev = categoryTotals.get(product.categoryName) || 0;
          categoryTotals.set(product.categoryName, prev + item.totalAmount);
        }
      }
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    let idx = 0;
    const result: { name: string; value: number; color: string }[] = [];
    categoryTotals.forEach((val, name) => {
      if (val > 0) {
        result.push({
          name,
          value: Number(val.toFixed(2)),
          color: COLORS[idx % COLORS.length],
        });
        idx++;
      }
    });

    return result;
  }
}

// Global Singleton Instance
export const db = new SmartBillDatabase();
