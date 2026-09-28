import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Eye,
  Plus,
  ArrowRight
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
import { DashboardStats, Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardPageProps {
  onNavigateTab: (tab: any) => void;
  onOpenNewBill: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenNewBill,
  onSelectInvoice,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [s, chart, rec] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getDailySales(),
        api.dashboard.getRecentInvoices(6),
      ]);
      setStats(s);
      setSalesChart(chart);
      setRecentInvoices(rec);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
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
      title: "Today's Total Sales",
      value: formatCurrency(stats.todaySales),
      subtext: 'Billed today',
      icon: TrendingUp,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: "Today's Total Bills",
      value: stats.todayBills.toString(),
      subtext: 'Transactions today',
      icon: Receipt,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      subtext: 'All-time gross revenue',
      icon: TrendingUp,
      color: 'from-purple-600 to-pink-600',
    },
    {
      title: 'Total Bills',
      value: stats.totalBills.toString(),
      subtext: 'All-time invoices created',
      icon: Receipt,
      color: 'from-cyan-600 to-blue-600',
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

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Bills</h2>
            <p className="text-xs text-slate-500">Latest generated invoices</p>
          </div>
          <button
            onClick={() => onNavigateTab('invoices')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Sales History</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Invoice Number</th>
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
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No bills generated yet. Click "New Bill" to create your first invoice!
                  </td>
                </tr>
              ) : (
                recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
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
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View & Print Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
