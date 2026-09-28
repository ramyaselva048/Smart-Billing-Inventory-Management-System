import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  Package,
  AlertTriangle,
  Clock,
  Wallet,
  ArrowUpRight,
  Plus,
  Eye,
  Printer,
  ChevronRight,
  Boxes,
  Percent
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, Invoice, Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardPageProps {
  onNavigateTab: (tab: any) => void;
  onOpenNewBill: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenRestockModal: (product: Product) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenNewBill,
  onSelectInvoice,
  onOpenRestockModal,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [categoryChart, setCategoryChart] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [s, sc, cc, rec, prods] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getSalesChart(),
        api.dashboard.getCategoryChart(),
        api.dashboard.getRecentInvoices(6),
        api.products.getAll(),
      ]);

      setStats(s);
      setSalesChart(sc);
      setCategoryChart(cc);
      setRecentInvoices(rec);
      setLowStockProducts(prods.filter(p => p.stock <= p.minStock).slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      subtext: 'Gross Invoiced Amount',
      icon: TrendingUp,
      color: 'from-blue-600 to-indigo-600',
      badge: '+14.2% MoM',
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      subtext: 'Billed Today',
      icon: Receipt,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Active Today',
    },
    {
      title: 'Total Revenue Collected',
      value: formatCurrency(stats.totalRevenue),
      subtext: 'Received in Bank/Cash',
      icon: Wallet,
      color: 'from-cyan-600 to-blue-600',
      badge: 'Liquid Assets',
    },
    {
      title: 'Pending Receivables',
      value: formatCurrency(stats.pendingReceivables),
      subtext: 'Unpaid Customer Invoices',
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      badge: 'Action Required',
    },
    {
      title: 'Total Invoices',
      value: stats.totalBills.toString(),
      subtext: 'Tax Invoices Generated',
      icon: Receipt,
      color: 'from-purple-600 to-pink-600',
      badge: 'All Time',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toString(),
      subtext: 'Registered Accounts',
      icon: Users,
      color: 'from-indigo-600 to-violet-600',
      badge: 'Active Directory',
    },
    {
      title: 'Products in Catalog',
      value: stats.totalProducts.toString(),
      subtext: 'Across all categories',
      icon: Package,
      color: 'from-slate-700 to-slate-900',
      badge: 'Live SKUs',
    },
    {
      title: 'Low Stock Alerts',
      value: (stats.lowStockCount + stats.outOfStockCount).toString(),
      subtext: `${stats.outOfStockCount} Out of Stock`,
      icon: AlertTriangle,
      color: stats.lowStockCount + stats.outOfStockCount > 0 ? 'from-rose-600 to-red-600' : 'from-emerald-600 to-teal-600',
      badge: stats.lowStockCount + stats.outOfStockCount > 0 ? 'Restock Needed' : 'Inventory Healthy',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview of sales, inventory status, and receivables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Boxes className="w-4 h-4 text-slate-500" />
            Manage Inventory
          </button>
          <button
            onClick={onOpenNewBill}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New POS Bill
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {c.title}
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                    {c.value}
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${c.color} text-white flex items-center justify-center shadow-md shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{c.subtext}</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                  {c.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Sales Revenue</h2>
              <p className="text-xs text-slate-500">Gross billing volume across recent periods</p>
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              FY 2026-27
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={val => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Sales Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category Donut Chart (1 col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sales by Category</h2>
              <p className="text-xs text-slate-500">Revenue contribution</p>
            </div>
          </div>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Sales']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            {categoryChart.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-slate-600 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Invoices & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
              <p className="text-xs text-slate-500">Latest sales transactions and payment statuses</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All Invoices <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 truncate max-w-[150px]">
                        {inv.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-[11px]">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : inv.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        title="View / Print Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts Box (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Low Stock Alerts</h3>
                <p className="text-[11px] text-slate-500">Items below minimum stock threshold</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Inventory
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All inventory levels are sufficient.
              </div>
            ) : (
              lowStockProducts.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {p.stock === 0 ? 'OUT OF STOCK' : `Only ${p.stock} ${p.unit} left`}
                      </span>
                      <span className="text-[10px] text-slate-400">Min: {p.minStock}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenRestockModal(p)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shrink-0 shadow-xs"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
