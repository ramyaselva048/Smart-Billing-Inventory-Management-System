import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Eye,
  Printer,
  Plus,
  ArrowRight,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, Invoice, BusinessSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { printInvoiceDirect } from '../utils/invoicePrint';

interface DashboardPageProps {
  onNavigateTab: (tab: any) => void;
  onOpenNewBill: () => void;
  onSelectInvoice: (invoice: Invoice, autoPrint?: boolean) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenNewBill,
  onSelectInvoice,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [s, chart, rec, st] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getDailySales(),
        api.dashboard.getRecentInvoices(10),
        api.settings.get(),
      ]);
      setStats(s);
      setSalesChart(chart);
      setRecentInvoices(rec);
      setSettings(st);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === recentInvoices.length && recentInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recentInvoices.map(inv => inv.id));
    }
  };

  const handleDeleteSingle = async (inv: Invoice) => {
    if (window.confirm(`Delete bill #${inv.invoiceNumber}? This action cannot be undone.`)) {
      try {
        await api.invoices.delete(inv.id);
        setSelectedIds(prev => prev.filter(id => id !== inv.id));
        setNotificationMessage(`Bill #${inv.invoiceNumber} deleted successfully.`);
        setTimeout(() => setNotificationMessage(null), 3000);
        await loadDashboardData();
      } catch (err) {
        console.error('Failed to delete invoice:', err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected bills? This action cannot be undone.`)) {
      try {
        await api.invoices.deleteMultiple(selectedIds);
        setNotificationMessage(`${selectedIds.length} bills deleted successfully.`);
        setSelectedIds([]);
        setTimeout(() => setNotificationMessage(null), 3000);
        await loadDashboardData();
      } catch (err) {
        console.error('Failed to delete selected invoices:', err);
      }
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Daily Sales (Today)",
      value: formatCurrency(stats.todaySales),
      subtext: `${stats.todayBills} bills generated today`,
      icon: TrendingUp,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: 'Weekly Sales (7 Days)',
      value: formatCurrency(stats.weeklySales ?? stats.todaySales),
      subtext: 'Last 7 days revenue',
      icon: TrendingUp,
      color: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Monthly Sales (This Month)',
      value: formatCurrency(stats.monthlySales ?? stats.totalSales),
      subtext: 'Current month total',
      icon: TrendingUp,
      color: 'from-purple-600 to-pink-600',
    },
    {
      title: 'Yearly Sales (This Year)',
      value: formatCurrency(stats.yearlySales ?? stats.totalSales),
      subtext: `All-time: ${stats.totalBills} bills`,
      icon: Receipt,
      color: 'from-cyan-600 to-teal-600',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time overview of daily sales, invoices generated, and revenue metrics.
          </p>
        </div>

        <button
          onClick={onOpenNewBill}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Bill</span>
        </button>
      </div>

      {/* 4 KPI Cards: Today's Total Sales, Today's Total Bills, Total Sales, Total Bills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {kpi.title}
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono tracking-tight">
                    {kpi.value}
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${kpi.color} text-white flex items-center justify-center shadow-md shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                {kpi.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple Sales Chart */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sales Trend (Last 7 Days)</h2>
            <p className="text-xs text-slate-500">Daily billing revenue</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            Daily Sales
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="#64748b"
                fontSize={12}
                tickFormatter={val => `₹${val}`}
              />
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
              <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMessage}</span>
        </div>
      )}

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Recent Bills</h2>
              {selectedIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Latest generated invoices with select and delete options</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
                title="Delete all selected bills"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer ml-auto"
            >
              <span>View All Sales History</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === recentInvoices.length && recentInvoices.length > 0}
                    onChange={handleSelectAll}
                    title="Select All"
                    aria-label="Select All"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                  />
                </th>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No bills generated yet. Click "New Bill" to create your first invoice!
                  </td>
                </tr>
              ) : (
                recentInvoices.map(inv => {
                  const isSelected = selectedIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="w-10 px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PAID
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Invoice */}
                          <button
                            onClick={() => onSelectInvoice(inv, false)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Print Invoice */}
                          <button
                            onClick={() => {
                              if (settings) {
                                printInvoiceDirect(inv, settings);
                              }
                              onSelectInvoice(inv, false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Bill (Direct Printer Dialog)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {/* Delete Invoice */}
                          <button
                            onClick={() => handleDeleteSingle(inv)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
