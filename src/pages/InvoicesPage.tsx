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
  Receipt
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/invoicePdf';
import { printInvoiceDirect } from '../utils/invoicePrint';

interface InvoicesPageProps {
  onSelectInvoice: (invoice: Invoice) => void;
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

  // Search by multiple fields (Typeable)
  const [search, setSearch] = useState(initialSearch);

  // Date filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
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

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
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

      // Filter by date
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = inv.date === todayStr;
      } else if (dateFilter === 'week') {
        const diff = (now.getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
        matchesDate = diff <= 7;
      } else if (dateFilter === 'month') {
        const d = new Date(inv.date);
        matchesDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
            Type in search to find bills by customer, invoice number, item name, or amount.
          </p>
        </div>

        <button
          onClick={onOpenNewBill}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Bill</span>
        </button>
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

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <span className="text-slate-400 text-xs flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
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

        {/* Filter Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Found <b className="text-slate-800">{filteredInvoices.length}</b> invoice{filteredInvoices.length === 1 ? '' : 's'}
          </span>
          <span>
            Total Value: <b className="text-blue-600 font-mono font-bold">{formatCurrency(totalFilteredSales)}</b>
          </span>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Invoice Number</th>
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
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    Loading sales history...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Invoice Number */}
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
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

                    {/* Actions: View invoice, Print invoice, Download PDF */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Invoice */}
                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View / Print Bill"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Print Invoice */}
                        <button
                          onClick={() => {
                            if (settings) {
                              printInvoiceDirect(inv, settings);
                            }
                            onSelectInvoice(inv);
                          }}
                          className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                          title="Print Receipt"
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
                      </div>
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
