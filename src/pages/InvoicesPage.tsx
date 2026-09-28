import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Printer,
  Ban,
  Download,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { Invoice, PaymentStatus, PaymentMethod, BusinessSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { generateInvoicePDF } from '../utils/invoicePdf';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface InvoicesPageProps {
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenNewBill: () => void;
  initialSearch?: string;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onSelectInvoice, onOpenNewBill, initialSearch = '' }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Cancel Modal
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const st = await api.settings.get();
      setSettings(st);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.invoices.getAll();
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q);

      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === 'all' || inv.paymentMethod === methodFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const invDate = new Date(inv.date);
        const now = new Date();
        if (dateFilter === 'today') {
          matchesDate = invDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        } else if (dateFilter === 'month') {
          matchesDate =
            invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [invoices, search, statusFilter, methodFilter, dateFilter]);

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Invoice #',
      'Date',
      'Customer',
      'Phone',
      'Items Count',
      'Subtotal',
      'Discount',
      'Tax / GST',
      'Grand Total',
      'Paid Amount',
      'Balance Due',
      'Payment Status',
      'Payment Method',
      'Status'
    ];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      formatDate(inv.createdAt),
      inv.customerName,
      inv.customerPhone,
      inv.items.length,
      inv.subtotal,
      inv.discountAmount,
      inv.taxAmount,
      inv.grandTotal,
      inv.paidAmount,
      inv.balanceDue,
      inv.paymentStatus,
      inv.paymentMethod,
      inv.status.toUpperCase()
    ]);
    exportToCSV(`SmartBill_Invoices_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrintInvoicesList = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Payment Method', 'Status', 'Total (₹)', 'Paid (₹)', 'Due (₹)'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      formatDate(inv.createdAt),
      inv.customerName,
      inv.paymentMethod,
      inv.status === 'cancelled' ? 'CANCELLED' : inv.paymentStatus.toUpperCase(),
      formatCurrency(inv.grandTotal),
      formatCurrency(inv.paidAmount),
      formatCurrency(inv.balanceDue),
    ]);

    printReport(
      'Sales Invoices Statement',
      'Complete Sales Ledger & Payment Tracking',
      headers,
      rows,
      [
        { label: 'Total Invoices', value: String(filteredInvoices.length) },
        { label: 'Total Sales', value: formatCurrency(totalBilled) },
        { label: 'Total Collected', value: formatCurrency(totalCollected) },
        { label: 'Total Outstanding', value: formatCurrency(totalDue) },
      ]
    );
  };

  const handleDownloadPDFInvoicesList = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Method', 'Status', 'Total (₹)', 'Paid (₹)', 'Due (₹)'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      formatDate(inv.createdAt),
      inv.customerName,
      inv.paymentMethod,
      inv.status === 'cancelled' ? 'CANCELLED' : inv.paymentStatus.toUpperCase(),
      formatCurrency(inv.grandTotal),
      formatCurrency(inv.paidAmount),
      formatCurrency(inv.balanceDue),
    ]);

    downloadPDFReport(
      'Sales Invoices Statement',
      'Complete Sales Ledger & Payment Tracking',
      headers,
      rows,
      [
        { label: 'Total Invoices', value: String(filteredInvoices.length) },
        { label: 'Total Sales', value: formatCurrency(totalBilled) },
        { label: 'Total Collected', value: formatCurrency(totalCollected) },
        { label: 'Total Outstanding', value: formatCurrency(totalDue) },
      ],
      'sales_invoices_report'
    );
  };

  const handleDownloadSingleInvoice = async (inv: Invoice) => {
    try {
      const currentSettings = settings || await api.settings.get();
      generateInvoicePDF(inv, currentSettings);
    } catch (err) {
      console.error('Error generating single invoice PDF:', err);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingInvoice) return;
    if (!cancelReason.trim()) {
      setCancelError('Please specify the cancellation reason.');
      return;
    }

    try {
      setCancelLoading(true);
      await api.invoices.cancel(cancellingInvoice.id, cancelReason.trim());
      setCancellingInvoice(null);
      setCancelReason('');
      setCancelError(null);
      await loadInvoices();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel invoice.');
    } finally {
      setCancelLoading(false);
    }
  };

  const totalBilled = filteredInvoices.reduce((a, b) => a + (b.status !== 'cancelled' ? b.grandTotal : 0), 0);
  const totalCollected = filteredInvoices.reduce((a, b) => a + (b.status !== 'cancelled' ? b.paidAmount : 0), 0);
  const totalDue = filteredInvoices.reduce((a, b) => a + (b.status !== 'cancelled' ? b.balanceDue : 0), 0);

  const statusOptions = [
    { value: 'all', label: 'All Payment Statuses' },
    { value: 'Paid', label: 'Paid Only', badge: 'PAID', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { value: 'Partial', label: 'Partial Payments', badge: 'PARTIAL', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'Pending', label: 'Pending / Unpaid', badge: 'PENDING', badgeColor: 'bg-rose-100 text-rose-800' },
  ];

  const methodOptions = [
    { value: 'all', label: 'All Payment Methods' },
    { value: 'UPI', label: 'UPI / QR', badge: 'DIGITAL', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'Cash', label: 'Cash Payment', badge: 'CASH', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { value: 'Card', label: 'Debit / Credit Card', badge: 'CARD', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'Bank Transfer', label: 'Bank Transfer / NEFT', badge: 'BANK', badgeColor: 'bg-indigo-100 text-indigo-700' },
    { value: 'Credit', label: 'Customer Credit', badge: 'CREDIT', badgeColor: 'bg-amber-100 text-amber-700' },
  ];

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today Only' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales & Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history, reprint invoices, export spreadsheets, and manage receipts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Universal Export & Print Controls */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrintInvoicesList}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Invoices Statement"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDFInvoicesList}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download PDF Statement"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={onOpenNewBill}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Filtered Total Sales</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{formatCurrency(totalBilled)}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Collected</span>
            <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">{formatCurrency(totalCollected)}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Balance Due</span>
            <div className="text-lg font-black text-amber-600 font-mono mt-0.5">{formatCurrency(totalDue)}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with SearchableSelect */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice #, customer name, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* Typeable Payment Status Filter */}
          <div>
            <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onChange={val => setStatusFilter(val || 'all')}
              placeholder="Filter payment status..."
              searchPlaceholder="Type to filter status..."
            />
          </div>

          {/* Typeable Payment Method Filter */}
          <div>
            <SearchableSelect
              options={methodOptions}
              value={methodFilter}
              onChange={val => setMethodFilter(val || 'all')}
              placeholder="Filter payment method..."
              searchPlaceholder="Type to filter payment..."
            />
          </div>

          {/* Typeable Date Range Filter */}
          <div>
            <SearchableSelect
              options={dateOptions}
              value={dateFilter}
              onChange={val => setDateFilter(val || 'all')}
              placeholder="Filter time period..."
              searchPlaceholder="Type to filter date..."
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Invoice No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total (₹)</th>
                <th className="px-4 py-3 text-right">Paid (₹)</th>
                <th className="px-4 py-3 text-right">Due (₹)</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isCancelled = inv.status === 'cancelled';
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCancelled ? 'bg-slate-50/60 opacity-60' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-600">
                          {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold">
                        <span className={inv.balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}>
                          {formatCurrency(inv.balanceDue)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                            CANCELLED
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.paymentStatus === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View A4 Preview */}
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View / Print A4 Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print Invoice Directly */}
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Quick Download PDF */}
                          <button
                            onClick={() => handleDownloadSingleInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancellingInvoice(inv);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Invoice & Restore Stock"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Cancel Invoice Confirmation Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Cancel Tax Invoice</h3>
              </div>
              <button
                onClick={() => setCancellingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 text-xs text-slate-600 space-y-2">
              <p>
                Are you sure you want to cancel invoice{' '}
                <b className="font-mono text-slate-900">{cancellingInvoice.invoiceNumber}</b>?
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 space-y-1">
                <p className="font-bold">Automated Reversal Notice:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>All {cancellingInvoice.items.length} line item product quantities will be restored to live inventory.</li>
                  <li>Customer purchase statistics and outstanding balances will be safely deducted.</li>
                  <li>An immutable audit log entry will be created.</li>
                </ul>
              </div>

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {cancelError}
                </div>
              )}

              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer returned items / entered in error"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Keep Invoice
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={cancelLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
