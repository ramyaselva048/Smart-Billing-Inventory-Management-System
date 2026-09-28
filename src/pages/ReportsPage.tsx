import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  TrendingUp,
  Receipt,
  Search,
  X,
  CreditCard,
  QrCode,
  Banknote
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
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV, printReport } from '../utils/exportUtils';

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [metrics, setMetrics] = useState<{
    todaySales: number;
    weeklySales: number;
    monthlySales: number;
    totalBills: number;
    totalRevenue: number;
    filteredInvoices: Invoice[];
  }>({
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    totalBills: 0,
    totalRevenue: 0,
    filteredInvoices: [],
  });

  const [dailySalesChart, setDailySalesChart] = useState<any[]>([]);
  const [monthlySalesChart, setMonthlySalesChart] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [dateRange, customStartDate, customEndDate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [sum, daily, monthly, payment] = await Promise.all([
        api.reports.getSummary(dateRange, customStartDate, customEndDate),
        api.reports.getDailySales(),
        api.reports.getMonthlySales(),
        api.reports.getPaymentSummary(),
      ]);

      setMetrics(sum);
      setDailySalesChart(daily);
      setMonthlySalesChart(monthly);
      setPaymentSummary(payment);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Further filter report invoices by user typed search query
  const searchedInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return metrics.filteredInvoices;

    return metrics.filteredInvoices.filter(inv => {
      const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCust = (inv.customerName || '').toLowerCase().includes(q);
      const matchPay = inv.paymentMethod.toLowerCase().includes(q);
      const matchItems = inv.items.some(it => it.itemName.toLowerCase().includes(q));
      const matchAmount = inv.grandTotal.toString().includes(q);
      return matchInv || matchCust || matchPay || matchItems || matchAmount;
    });
  }, [metrics.filteredInvoices, searchQuery]);

  const searchedRevenue = useMemo(() => {
    return searchedInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  }, [searchedInvoices]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Payment Method', 'Status', 'Grand Total (₹)'];
    const rows = searchedInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      inv.customerName || 'Walk-in',
      inv.paymentMethod,
      inv.paymentStatus,
      inv.grandTotal,
    ]);
    exportToCSV(`SmartBill_Report_${dateRange}_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Print Report
  const handlePrint = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Payment Method', 'Status', 'Total (₹)'];
    const rows = searchedInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      inv.customerName || 'Walk-in',
      inv.paymentMethod,
      inv.paymentStatus,
      formatCurrency(inv.grandTotal),
    ]);

    printReport(
      'Sales & Revenue Report',
      `Filter: ${dateRange.toUpperCase()} ${customStartDate ? `(${customStartDate} to ${customEndDate || 'today'})` : ''} • Generated on ${new Date().toLocaleDateString('en-IN')}`,
      headers,
      rows,
      [
        { label: "Today's Sales", value: formatCurrency(metrics.todaySales) },
        { label: 'Weekly Sales', value: formatCurrency(metrics.weeklySales) },
        { label: 'Monthly Sales', value: formatCurrency(metrics.monthlySales) },
        { label: 'Filtered Revenue', value: formatCurrency(searchedRevenue) },
        { label: 'Filtered Bills', value: String(searchedInvoices.length) },
      ]
    );
  };

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive sales summaries, revenue statistics, custom date range, and payment breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range & Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-slate-400 text-xs flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Filter Range:
            </span>
            {[
              { id: 'all', label: 'All Records' },
              { id: 'today', label: "Today's Sales" },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setDateRange(opt.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  dateRange === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search within Report Input (Typeable) */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Type to filter report..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Inputs (Typeable) */}
        {dateRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50/50 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-700">Type / Select Dates:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5 Revenue & Sales KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Today's Sales
          </span>
          <div className="text-xl font-extrabold text-blue-600 font-mono mt-1">
            {formatCurrency(metrics.todaySales)}
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Weekly Sales
          </span>
          <div className="text-xl font-extrabold text-indigo-600 font-mono mt-1">
            {formatCurrency(metrics.weeklySales)}
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Monthly Sales
          </span>
          <div className="text-xl font-extrabold text-purple-600 font-mono mt-1">
            {formatCurrency(metrics.monthlySales)}
          </div>
        </div>

        {/* Filtered Bills */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Filtered Bills
          </span>
          <div className="text-xl font-extrabold text-slate-800 font-mono mt-1">
            {searchedInvoices.length}
          </div>
        </div>

        {/* Total Filtered Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Filtered Revenue
          </span>
          <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {formatCurrency(searchedRevenue)}
          </div>
        </div>
      </div>

      {/* Charts Section: Daily Sales, Monthly Sales, Cash/UPI/Card Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Daily Sales Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Past 7 days revenue</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Sales</h3>
          <p className="text-xs text-slate-500 mb-4">Last 6 months volume</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Monthly Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash / UPI / Card Sales Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Payment Method Distribution</h3>
          <p className="text-xs text-slate-500 mb-2">Cash vs UPI vs Card revenue</p>
          <div className="h-52 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentSummary}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={40}
                  paddingAngle={5}
                >
                  {paymentSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filtered Report Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Detailed Invoices Breakdown ({searchedInvoices.length})
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-700">
            Total: {formatCurrency(searchedRevenue)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items Count</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Tax & Disc</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                searchedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {inv.customerName || <span className="text-slate-400 italic">Walk-in</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inv.items.length} items</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      +{formatCurrency(inv.gst)} {inv.discount > 0 ? `(-${formatCurrency(inv.discount)})` : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {inv.paymentMethod}
                      </span>
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
