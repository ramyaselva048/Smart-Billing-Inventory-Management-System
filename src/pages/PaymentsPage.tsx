import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Wallet,
  Calendar,
  X,
  Building,
  QrCode,
  Banknote,
  Printer,
  Download
} from 'lucide-react';
import { Payment, Invoice, PaymentMethod } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface PaymentsPageProps {
  initialSearch?: string;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ initialSearch = '' }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const [methodFilter, setMethodFilter] = useState('all');

  // Record Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amountInput, setAmountInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pays, invs] = await Promise.all([
        api.payments.getAll(),
        api.invoices.getAll(),
      ]);
      setPayments(pays);
      setInvoices(invs);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordPayment = (preselectedInvoiceId?: string) => {
    setSelectedInvoiceId(preselectedInvoiceId || '');
    if (preselectedInvoiceId) {
      const inv = invoices.find(i => i.id === preselectedInvoiceId);
      if (inv) {
        setAmountInput(inv.balanceDue);
      }
    } else {
      setAmountInput(0);
    }
    setPaymentMethod('UPI');
    setRefNumber('');
    setNotes('');
    setFormError(null);
    setRecordModalOpen(true);
  };

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setAmountInput(inv.balanceDue);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setFormError('Please select an invoice to apply this payment.');
      return;
    }

    if (amountInput <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }

    const targetInvoice = invoices.find(i => i.id === selectedInvoiceId);
    if (!targetInvoice) {
      setFormError('Invoice not found.');
      return;
    }

    if (amountInput > targetInvoice.balanceDue) {
      setFormError(
        `Amount cannot exceed the balance due of ${formatCurrency(targetInvoice.balanceDue)}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await api.payments.create({
        invoiceId: selectedInvoiceId,
        amount: amountInput,
        paymentMethod,
        referenceNumber: refNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setRecordModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Payment ID',
      'Invoice #',
      'Customer',
      'Amount',
      'Method',
      'Reference / UTR',
      'Payment Date',
      'Notes'
    ];
    const rows = filteredPayments.map(p => [
      p.id,
      p.invoiceNumber,
      p.customerName,
      p.amount,
      p.paymentMethod,
      p.referenceNumber || '-',
      formatDateTime(p.paymentDate),
      p.notes || '-'
    ]);
    exportToCSV(`SmartBill_Payments_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = ['Invoice #', 'Customer', 'Amount (₹)', 'Payment Method', 'Reference / UTR', 'Date', 'Notes'];
    const rows = filteredPayments.map(p => [
      p.invoiceNumber,
      p.customerName,
      formatCurrency(p.amount),
      p.paymentMethod,
      p.referenceNumber || '-',
      formatDateTime(p.paymentDate),
      p.notes || '-',
    ]);

    printReport(
      'Payments & Receipts Ledger',
      'Realized Collections, Cash / Digital Receipts & Transaction References',
      headers,
      rows,
      [
        { label: 'Total Receipts Count', value: String(filteredPayments.length) },
        { label: 'Total Realized Collections', value: formatCurrency(totalPaid) },
        { label: "Today's Collections", value: formatCurrency(todayPayments) },
        { label: 'Outstanding Balance', value: formatCurrency(totalPending) },
      ]
    );
  };

  const handleDownloadPDF = () => {
    const headers = ['Invoice #', 'Customer', 'Amount (₹)', 'Method', 'Ref / UTR', 'Date', 'Notes'];
    const rows = filteredPayments.map(p => [
      p.invoiceNumber,
      p.customerName,
      formatCurrency(p.amount),
      p.paymentMethod,
      p.referenceNumber || '-',
      formatDateTime(p.paymentDate),
      p.notes || '-',
    ]);

    downloadPDFReport(
      'Payments & Receipts Ledger',
      'Realized Collections, Cash / Digital Receipts & Transaction References',
      headers,
      rows,
      [
        { label: 'Total Receipts Count', value: String(filteredPayments.length) },
        { label: 'Total Realized Collections', value: formatCurrency(totalPaid) },
        { label: "Today's Collections", value: formatCurrency(todayPayments) },
        { label: 'Outstanding Balance', value: formatCurrency(totalPending) },
      ],
      'payments_ledger_report'
    );
  };

  const pendingInvoices = invoices.filter(
    i => i.status !== 'cancelled' && i.balanceDue > 0
  );

  const invoiceOptions = pendingInvoices.map(inv => ({
    value: inv.id,
    label: `${inv.invoiceNumber} - ${inv.customerName}`,
    sublabel: `Due: ${formatCurrency(inv.balanceDue)} • Total: ${formatCurrency(inv.grandTotal)}`,
    badge: `DUE ₹${inv.balanceDue}`,
    badgeColor: 'bg-amber-100 text-amber-800'
  }));

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalPending = pendingInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = payments
    .filter(p => p.paymentDate.startsWith(todayStr))
    .reduce((acc, p) => acc + p.amount, 0);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q));

      const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, search, methodFilter]);

  const methodFilterOptions = [
    { value: 'all', label: 'All Payment Methods' },
    { value: 'UPI', label: 'UPI / QR Payments', badge: 'DIGITAL', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'Cash', label: 'Cash Payments', badge: 'CASH', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { value: 'Card', label: 'Card Payments (POS)', badge: 'CARD', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'Bank Transfer', label: 'Bank Transfer / NEFT', badge: 'BANK', badgeColor: 'bg-indigo-100 text-indigo-700' },
  ];

  const paymentMethodOptions = [
    { value: 'UPI', label: 'UPI / QR Payment', badge: 'INSTANT', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'Cash', label: 'Cash at Register', badge: 'CASH', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { value: 'Card', label: 'Credit/Debit Card (POS)', badge: 'CARD', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'Bank Transfer', label: 'Bank Transfer / NEFT', badge: 'BANK', badgeColor: 'bg-indigo-100 text-indigo-700' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Receipts & Ledgers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cash, UPI, Card, and Bank collection records against sales invoices
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
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Payments Ledger"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download PDF Ledger"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => handleOpenRecordPayment()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Realized Collections
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {formatCurrency(totalPaid)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">All receipts recorded</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="text-2xl font-black text-blue-600 font-mono mt-1">
              {formatCurrency(todayPayments)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Received today</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Accounts Receivable
            </span>
            <div className="text-2xl font-black text-amber-600 font-mono mt-1">
              {formatCurrency(totalPending)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{pendingInvoices.length} invoices due</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with SearchableSelect */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice #, customer name, txn reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <SearchableSelect
            options={methodFilterOptions}
            value={methodFilter}
            onChange={val => setMethodFilter(val || 'all')}
            placeholder="Filter payment method..."
            searchPlaceholder="Type to filter..."
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Receipt ID</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Amount Paid</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / UTR</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No payment receipts found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-500 font-medium text-[11px]">
                      {p.id}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                      {p.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {p.customerName}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {p.paymentMethod === 'Cash' && <Banknote className="w-3 h-3 text-emerald-600" />}
                        {p.paymentMethod === 'UPI' && <QrCode className="w-3 h-3 text-blue-600" />}
                        {p.paymentMethod === 'Card' && <CreditCard className="w-3 h-3 text-purple-600" />}
                        {p.paymentMethod === 'Bank Transfer' && <Building className="w-3 h-3 text-indigo-600" />}
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 text-[11px]">
                      {p.referenceNumber || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDateTime(p.paymentDate)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 italic max-w-xs truncate">
                      {p.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {recordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Record Customer Payment</h3>
              </div>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Unpaid / Partial Invoice *
                </label>
                <SearchableSelect
                  options={invoiceOptions}
                  value={selectedInvoiceId}
                  onChange={handleSelectInvoice}
                  placeholder="Select invoice to pay..."
                  searchPlaceholder="Type invoice number or customer name..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountInput}
                  onChange={e => setAmountInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <SearchableSelect
                  options={paymentMethodOptions}
                  value={paymentMethod}
                  onChange={val => setPaymentMethod(val as PaymentMethod)}
                  placeholder="Select payment method..."
                  searchPlaceholder="Type to filter..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  placeholder="e.g. UPI/123456789 or Cheque No"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional internal payment remark"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Save Payment Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
