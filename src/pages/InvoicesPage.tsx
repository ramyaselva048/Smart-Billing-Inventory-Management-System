import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Eye,
  Printer,
  Download,
  Calendar,
  Plus,
  User,
  Phone,
  X,
  Filter,
  Receipt,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/invoicePdf';
import { printInvoiceDirect } from '../utils/invoicePrint';

interface InvoicesPageProps {
  onSelectInvoice: (invoice: Invoice, autoPrint?: boolean) => void;
  onOpenNewBill: () => void;
  initialSearch?: string;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onSelectInvoice,
  onOpenNewBill,
  initialSearch = '',
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Search by multiple fields (Typeable)
  const [search, setSearch] = useState(initialSearch);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Date filters: all, today (daily), week (weekly), month (monthly), year (yearly), custom
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invs, st] = await Promise.all([
        api.invoices.getAll(),
        api.settings.get(),
      ]);
      setInvoices(invs);
      setSettings(st);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters back to default
  const handleResetFilters = () => {
    setSearch('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Reset Sales Data to default sample records
  const handleResetSalesData = async () => {
    if (window.confirm('Reset all sales history to default demo records?')) {
      try {
        setLoading(true);
        const fresh = await api.invoices.resetSalesData();
        setInvoices(fresh);
        handleResetFilters();
        setResetMessage('Sales history has been reset to default demo records!');
        setTimeout(() => setResetMessage(null), 4000);
      } catch (err) {
        console.error('Failed to reset sales data:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const handleDeleteSingle = async (inv: Invoice) => {
    if (window.confirm(`Delete bill #${inv.invoiceNumber}? This action cannot be undone.`)) {
      try {
        await api.invoices.delete(inv.id);
        setSelectedIds(prev => prev.filter(id => id !== inv.id));
        setResetMessage(`Bill #${inv.invoiceNumber} deleted successfully.`);
        setTimeout(() => setResetMessage(null), 3000);
        await loadData();
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
        setResetMessage(`${selectedIds.length} bills deleted successfully.`);
        setSelectedIds([]);
        setTimeout(() => setResetMessage(null), 3000);
        await loadData();
      } catch (err) {
        console.error('Failed to delete selected invoices:', err);
      }
    }
  };

  // Summary Metrics: Daily, Weekly, Monthly, Yearly
  const periodStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYearPrefix = `${now.getFullYear()}-`;
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let todayTotal = 0, todayCount = 0;
    let weekTotal = 0, weekCount = 0;
    let monthTotal = 0, monthCount = 0;
    let yearTotal = 0, yearCount = 0;

    for (const inv of invoices) {
      if (inv.date === todayStr) {
        todayTotal += inv.grandTotal;
        todayCount++;
      }
      if (inv.date >= sevenDaysAgoStr && inv.date <= todayStr) {
        weekTotal += inv.grandTotal;
        weekCount++;
      }
      if (inv.date.startsWith(currentMonthPrefix)) {
        monthTotal += inv.grandTotal;
        monthCount++;
      }
      if (inv.date.startsWith(currentYearPrefix)) {
        yearTotal += inv.grandTotal;
        yearCount++;
      }
    }

    return { todayTotal, todayCount, weekTotal, weekCount, monthTotal, monthCount, yearTotal, yearCount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYearPrefix = `${now.getFullYear()}-`;
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const q = search.trim().toLowerCase();

    return invoices.filter(inv => {
      // Search matches: Invoice #, Customer Name, Customer Phone, Item Names, Payment Method, Payment Ref
      let matchesSearch = true;
      if (q) {
        const itemNames = inv.items.map(it => it.itemName.toLowerCase()).join(' ');
        const matchesInvNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesCust = (inv.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (inv.customerPhone || '').toLowerCase().includes(q);
        const matchesItems = itemNames.includes(q);
        const matchesPay = inv.paymentMethod.toLowerCase().includes(q);
        const matchesRef = (inv.paymentRef || '').toLowerCase().includes(q);
        const matchesTotal = inv.grandTotal.toString().includes(q);

        matchesSearch = matchesInvNum || matchesCust || matchesPhone || matchesItems || matchesPay || matchesRef || matchesTotal;
      }

      // Filter by date: today, week, month, year, custom
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = inv.date === todayStr;
      } else if (dateFilter === 'week') {
        matchesDate = inv.date >= sevenDaysAgoStr && inv.date <= todayStr;
      } else if (dateFilter === 'month') {
        matchesDate = inv.date.startsWith(currentMonthPrefix);
      } else if (dateFilter === 'year') {
        matchesDate = inv.date.startsWith(currentYearPrefix);
      } else if (dateFilter === 'custom') {
        if (customStartDate && inv.date < customStartDate) matchesDate = false;
        if (customEndDate && inv.date > customEndDate) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [invoices, search, dateFilter, customStartDate, customEndDate]);

  const totalFilteredSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [filteredInvoices]);

  const handleDownloadPDF = (inv: Invoice) => {
    if (!settings) return;
    generateInvoicePDF(inv, settings);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily, Weekly, Monthly, and Yearly sales records. Search by customer, invoice number, item, or amount.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Reset Sales Data Button */}
          <button
            onClick={handleResetSalesData}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Reset sales records to default sample data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset Sales Data</span>
          </button>

          <button
            onClick={onOpenNewBill}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Banner */}
      {resetMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* 4 Periodic Sales Overview Cards (Daily, Weekly, Monthly, Yearly) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Daily (Today) */}
        <div
          onClick={() => setDateFilter('today')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            dateFilter === 'today'
              ? 'bg-blue-50 border-blue-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Daily (Today)</span>
            <span className="text-slate-400">{periodStats.todayCount} bills</span>
          </div>
          <div className="text-lg font-extrabold text-blue-600 font-mono mt-1">
            {formatCurrency(periodStats.todayTotal)}
          </div>
        </div>

        {/* Weekly (This Week) */}
        <div
          onClick={() => setDateFilter('week')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            dateFilter === 'week'
              ? 'bg-indigo-50 border-indigo-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Weekly (7 Days)</span>
            <span className="text-slate-400">{periodStats.weekCount} bills</span>
          </div>
          <div className="text-lg font-extrabold text-indigo-600 font-mono mt-1">
            {formatCurrency(periodStats.weekTotal)}
          </div>
        </div>

        {/* Monthly (This Month) */}
        <div
          onClick={() => setDateFilter('month')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            dateFilter === 'month'
              ? 'bg-purple-50 border-purple-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Monthly (This Month)</span>
            <span className="text-slate-400">{periodStats.monthCount} bills</span>
          </div>
          <div className="text-lg font-extrabold text-purple-600 font-mono mt-1">
            {formatCurrency(periodStats.monthTotal)}
          </div>
        </div>

        {/* Yearly (This Year) */}
        <div
          onClick={() => setDateFilter('year')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            dateFilter === 'year'
              ? 'bg-cyan-50 border-cyan-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Yearly (This Year)</span>
            <span className="text-slate-400">{periodStats.yearCount} bills</span>
          </div>
          <div className="text-lg font-extrabold text-cyan-600 font-mono mt-1">
            {formatCurrency(periodStats.yearTotal)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Universal Search Input (Typeable) */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, phone, item, or amount..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Pills: All, Today, This Week, This Month, This Year, Custom Range */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <span className="text-slate-400 text-xs flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Period:
            </span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Daily (Today)' },
              { id: 'week', label: 'Weekly (7 Days)' },
              { id: 'month', label: 'Monthly' },
              { id: 'year', label: 'Yearly' },
              { id: 'custom', label: 'Custom Range' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  dateFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {/* Reset Filters Button */}
            {(dateFilter !== 'all' || search || customStartDate || customEndDate) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/80 ml-1"
                title="Reset all filters back to All Dates"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range (Typeable From Date & To Date) */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50/50 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-700">Type / Select Custom Dates:</span>
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

        {/* Filter Stats & Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span>
              Found <b className="text-slate-800">{filteredInvoices.length}</b> invoice{filteredInvoices.length === 1 ? '' : 's'}
            </span>
            {selectedIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Delete all selected bills"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
            <span>
              Total Value: <b className="text-blue-600 font-mono font-bold">{formatCurrency(totalFilteredSales)}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="w-10 px-3 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleSelectAll}
                    title="Select All"
                    aria-label="Select All"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                  />
                </th>
                <th className="px-4 py-3.5">Invoice Number</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5 text-right">Total Amount</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    Loading sales history...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isSelected = selectedIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="w-10 px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                        />
                      </td>

                      {/* Invoice Number */}
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap font-medium">
                        {formatDate(inv.date)}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        {inv.customerName ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{inv.customerName}</span>
                            {inv.customerPhone && (
                              <span className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {inv.items.length} item{inv.items.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                          {inv.items.map(it => it.itemName).join(', ')}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(inv.grandTotal)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {inv.paymentMethod}
                        </span>
                        {inv.paymentRef && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[110px]">
                            {inv.paymentRef}
                          </span>
                        )}
                      </td>

                      {/* Status: Always PAID */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PAID
                        </span>
                      </td>

                      {/* Actions: View invoice, Print invoice, Download PDF, Delete */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Invoice */}
                          <button
                            onClick={() => onSelectInvoice(inv, false)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Bill Details"
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

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
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
