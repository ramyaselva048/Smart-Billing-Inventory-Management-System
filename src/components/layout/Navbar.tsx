import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCheck,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  Trash2,
  Check,
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Layers,
  Users,
  Boxes,
  CreditCard,
  BarChart3,
  Settings,
  History,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Notification, Product, Invoice, Customer } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { TabType } from './Sidebar';

interface RouteItem {
  tab: TabType;
  title: string;
  subtitle: string;
  keywords: string[];
}

const SYSTEM_ROUTES: RouteItem[] = [
  { tab: 'dashboard', title: 'Dashboard', subtitle: 'KPIs, Revenue & Analytics', keywords: ['home', 'dashboard', 'overview', 'kpi', 'revenue', 'analytics', 'stats'] },
  { tab: 'billing', title: 'Billing (POS)', subtitle: 'Create New Bill / POS Checkout', keywords: ['pos', 'bill', 'billing', 'counter', 'checkout', 'sale', 'new bill', 'create bill'] },
  { tab: 'invoices', title: 'Invoices & Sales', subtitle: 'View, Filter & Print Invoices', keywords: ['invoice', 'invoices', 'sales', 'history', 'bills', 'orders', 'tax invoice'] },
  { tab: 'products', title: 'Product Catalog', subtitle: 'Manage Items, Prices & GST', keywords: ['product', 'products', 'items', 'price', 'pricing', 'sku', 'catalog', 'stock'] },
  { tab: 'categories', title: 'Categories', subtitle: 'Organize Products into Groups', keywords: ['category', 'categories', 'groups', 'departments'] },
  { tab: 'customers', title: 'Customers', subtitle: 'Customer Directory & Credit Balances', keywords: ['customer', 'customers', 'client', 'clients', 'credit', 'outstanding', 'due'] },
  { tab: 'inventory', title: 'Inventory & Stock', subtitle: 'Stock Levels, Stock In & Adjustments', keywords: ['inventory', 'stock', 'restock', 'warehouse', 'adjust', 'levels'] },
  { tab: 'payments', title: 'Payments & Receipts', subtitle: 'Payment Records & UPI / Cash Entries', keywords: ['payment', 'payments', 'receipts', 'upi', 'cash', 'paid', 'transactions'] },
  { tab: 'reports', title: 'Reports & Analytics', subtitle: 'Sales, GST & Financial Statements', keywords: ['report', 'reports', 'analytics', 'gst report', 'tax', 'profit', 'statements'] },
  { tab: 'notifications', title: 'Notifications Center', subtitle: 'Stock Alerts & Payment Reminders', keywords: ['notifications', 'alerts', 'warnings', 'bell', 'messages'] },
  { tab: 'settings', title: 'Business Settings', subtitle: 'Company Info, GSTIN & Invoice Config', keywords: ['settings', 'business', 'company', 'gstin', 'profile', 'tax settings'] },
  { tab: 'users', title: 'User Management', subtitle: 'Admin & Staff Access Controls', keywords: ['users', 'staff', 'admin', 'roles', 'permissions', 'accounts'] },
  { tab: 'audit', title: 'Audit Trail Logs', subtitle: 'System Activity & Modification History', keywords: ['audit', 'logs', 'activity', 'history', 'trail', 'security'] },
];

interface NavbarProps {
  onOpenNewBill: () => void;
  onNavigateTab: (tab: TabType, params?: { search?: string }) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  notifications: Notification[];
  onRefreshNotifications: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewBill,
  onNavigateTab,
  onSelectInvoice,
  notifications,
  onRefreshNotifications,
  onToggleMobileMenu,
}) => {
  const { user, isAdmin } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    routes: RouteItem[];
    products: Product[];
    invoices: Invoice[];
    customers: Customer[];
  }>({ routes: [], products: [], invoices: [], customers: [] });

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifFilter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  // Real-time clock display
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Universal Search across Routes, Products, Invoices, and Customers
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults({ routes: [], products: [], invoices: [], customers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase().trim();

      // Matched application routes
      const matchedRoutes = SYSTEM_ROUTES.filter(r => {
        if (!isAdmin && (r.tab === 'users' || r.tab === 'settings' || r.tab === 'audit')) {
          return false;
        }
        return (
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.keywords.some(k => k.includes(q))
        );
      }).slice(0, 3);

      const [allProducts, allInvoices, allCustomers] = await Promise.all([
        api.products.getAll(),
        api.invoices.getAll(),
        api.customers.getAll(),
      ]);

      const matchedProducts = allProducts.filter(
        p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      ).slice(0, 4);

      const matchedInvoices = allInvoices.filter(
        i => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q)
      ).slice(0, 4);

      const matchedCustomers = allCustomers.filter(
        c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q))
      ).slice(0, 4);

      setSearchResults({
        routes: matchedRoutes,
        products: matchedProducts,
        invoices: matchedInvoices,
        customers: matchedCustomers,
      });
      setIsSearching(true);
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, isAdmin]);

  // Handle Search Input Keydown (e.g. Enter to jump)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchResults.routes.length > 0) {
        onNavigateTab(searchResults.routes[0].tab);
        setIsSearching(false);
        setSearchQuery('');
      } else if (searchResults.products.length > 0) {
        onNavigateTab('products', { search: searchResults.products[0].name });
        setIsSearching(false);
        setSearchQuery('');
      } else if (searchResults.invoices.length > 0) {
        if (onSelectInvoice) onSelectInvoice(searchResults.invoices[0]);
        else onNavigateTab('invoices', { search: searchResults.invoices[0].invoiceNumber });
        setIsSearching(false);
        setSearchQuery('');
      } else if (searchResults.customers.length > 0) {
        onNavigateTab('customers', { search: searchResults.customers[0].name });
        setIsSearching(false);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsSearching(false);
    }
  };

  // Notification Actions
  const handleMarkAllRead = async () => {
    await api.notifications.markAllAsRead();
    onRefreshNotifications();
  };

  const handleNotificationClick = async (notif: Notification) => {
    await api.notifications.markAsRead(notif.id);
    onRefreshNotifications();
    setShowNotifMenu(false);
    if (notif.linkTab) {
      onNavigateTab(notif.linkTab);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.notifications.delete(id);
    onRefreshNotifications();
  };

  const handleClearAllNotifications = async () => {
    await api.notifications.clearAll();
    onRefreshNotifications();
  };

  const handleClearReadNotifications = async () => {
    await api.notifications.clearRead();
    onRefreshNotifications();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Mobile Toggle & Universal Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative flex-1" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search everything: bills, products, customers, routes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearching(true);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearching && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto p-2 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-100 custom-scrollbar">
              {searchResults.routes.length === 0 &&
              searchResults.products.length === 0 &&
              searchResults.invoices.length === 0 &&
              searchResults.customers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching routes, products, invoices, or customers found for "{searchQuery}".
                </div>
              ) : (
                <>
                  {/* Matching Pages / Routes */}
                  {searchResults.routes.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                        <span>Pages & Modules ({searchResults.routes.length})</span>
                        <span className="text-[9px] text-blue-600 font-semibold">Quick Jump</span>
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.routes.map(r => (
                          <button
                            key={r.tab}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              onNavigateTab(r.tab);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50/80 flex items-center justify-between text-xs group cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 group-hover:text-blue-700">{r.title}</span>
                                <span className="block text-[11px] text-slate-400">{r.subtitle}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Go →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-slate-100 pt-2">
                        Products ({searchResults.products.length})
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.products.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              onNavigateTab('products', { search: p.name });
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs group cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <span className="ml-2 font-mono text-[10px] text-slate-500">[{p.sku}]</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  p.stock <= p.minStock
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Stock: {p.stock}
                              </span>
                              <span className="font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-slate-100 pt-2">
                        Invoices ({searchResults.invoices.length})
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.invoices.map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              if (onSelectInvoice) onSelectInvoice(inv);
                              else onNavigateTab('invoices', { search: inv.invoiceNumber });
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                              <span className="ml-2 text-slate-700">{inv.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                  inv.paymentStatus === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : inv.paymentStatus === 'Partial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {inv.paymentStatus}
                              </span>
                              <span className="font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-slate-100 pt-2">
                        Customers ({searchResults.customers.length})
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.customers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              onNavigateTab('customers', { search: c.name });
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-800">{c.name}</span>
                              <span className="ml-2 text-slate-500">{c.phone}</span>
                            </div>
                            {c.outstandingAmount > 0 && (
                              <span className="text-[10px] text-rose-600 font-semibold shrink-0">
                                Due: {formatCurrency(c.outstandingAmount)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick New Bill Button */}
        <button
          onClick={onOpenNewBill}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New Bill</span>
        </button>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium">{timeStr}</span>
        </div>

        {/* Notifications Dropdown Container */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mark read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifMenu(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-slate-100 bg-white text-xs px-2 pt-1 gap-2 shrink-0">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`pb-1.5 px-2 font-medium border-b-2 transition-colors cursor-pointer ${
                    notifFilter === 'all'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('unread')}
                  className={`pb-1.5 px-2 font-medium border-b-2 transition-colors cursor-pointer ${
                    notifFilter === 'unread'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-72 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <Bell className="w-6 h-6 text-slate-300" />
                    <span>
                      {notifFilter === 'unread'
                        ? 'No unread notifications.'
                        : 'No system notifications available.'}
                    </span>
                  </div>
                ) : (
                  filteredNotifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-2.5 items-start group ${
                        !notif.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          notif.type === 'out_of_stock'
                            ? 'bg-rose-500 ring-2 ring-rose-200'
                            : notif.type === 'low_stock'
                            ? 'bg-amber-500 ring-2 ring-amber-200'
                            : notif.type === 'payment_pending'
                            ? 'bg-purple-500 ring-2 ring-purple-200'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono shrink-0">
                            {formatDateTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Individual Dismiss Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all shrink-0 cursor-pointer"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
                <div className="flex items-center gap-1.5">
                  {notifications.some(n => n.read) && (
                    <button
                      onClick={handleClearReadNotifications}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Clear read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigateTab('notifications');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
            alt={user?.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
          />
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
              {user?.name}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                isAdmin ? 'text-purple-600' : 'text-emerald-600'
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
