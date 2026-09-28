import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileSpreadsheet,
  Receipt,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  X,
  CreditCard,
  Printer,
  Download
} from 'lucide-react';
import { Customer, Invoice } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface CustomersPageProps {
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenNewBill: () => void;
  initialSearch?: string;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onSelectInvoice, onOpenNewBill, initialSearch = '' }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // View Customer Profile Modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Delete Customer
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custs, invs] = await Promise.all([
        api.customers.getAll(),
        api.invoices.getAll(),
      ]);
      setCustomers(custs);
      setInvoices(invs);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('Chennai');
    setState('Tamil Nadu');
    setPincode('');
    setGstin('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setState(c.state || 'Tamil Nadu');
    setPincode(c.pincode || '');
    setGstin(c.gstin || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Customer name is required');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    try {
      if (editingCustomer) {
        await api.customers.update(editingCustomer.id, {
          name,
          phone,
          email,
          address,
          city,
          state,
          pincode,
          gstin,
        });
      } else {
        await api.customers.create({
          name,
          phone,
          email,
          address,
          city,
          state,
          pincode,
          gstin,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      setDeleteError(null);
      await api.customers.delete(deletingCustomer.id);
      setDeletingCustomer(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Cannot delete customer');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Name',
      'Phone',
      'Email',
      'City',
      'State',
      'GSTIN',
      'Total Purchases',
      'Outstanding Amount'
    ];
    const rows = filteredCustomers.map(c => [
      c.id,
      c.name,
      c.phone,
      c.email,
      c.city,
      c.state,
      c.gstin || '',
      c.totalPurchases,
      c.outstandingAmount
    ]);
    exportToCSV(`SmartBill_Customers_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = ['Customer Name', 'Phone', 'Email', 'City', 'State', 'GSTIN', 'Total Purchases (₹)', 'Outstanding Due (₹)'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone,
      c.email || '-',
      c.city || '-',
      c.state || '-',
      c.gstin || '-',
      formatCurrency(c.totalPurchases),
      formatCurrency(c.outstandingAmount),
    ]);

    const totalOutstanding = filteredCustomers.reduce((acc, c) => acc + (c.outstandingAmount || 0), 0);
    const totalPurchases = filteredCustomers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);

    printReport(
      'Customer Directory & Balances',
      'Client Accounts, Contact Ledger & Outstanding Balances',
      headers,
      rows,
      [
        { label: 'Total Clients', value: String(filteredCustomers.length) },
        { label: 'Total Sales Volume', value: formatCurrency(totalPurchases) },
        { label: 'Total Outstanding Balance', value: formatCurrency(totalOutstanding) },
      ]
    );
  };

  const handleDownloadPDF = () => {
    const headers = ['Customer Name', 'Phone', 'Email', 'City', 'State', 'GSTIN', 'Purchases (₹)', 'Due (₹)'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone,
      c.email || '-',
      c.city || '-',
      c.state || '-',
      c.gstin || '-',
      formatCurrency(c.totalPurchases),
      formatCurrency(c.outstandingAmount),
    ]);

    const totalOutstanding = filteredCustomers.reduce((acc, c) => acc + (c.outstandingAmount || 0), 0);
    const totalPurchases = filteredCustomers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);

    downloadPDFReport(
      'Customer Directory & Balances',
      'Client Accounts, Contact Ledger & Outstanding Balances',
      headers,
      rows,
      [
        { label: 'Total Clients', value: String(filteredCustomers.length) },
        { label: 'Total Sales Volume', value: formatCurrency(totalPurchases) },
        { label: 'Total Outstanding Balance', value: formatCurrency(totalOutstanding) },
      ],
      'customers_ledger_report'
    );
  };

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter(
      c =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const customerInvoices = useMemo(() => {
    if (!viewingCustomer) return [];
    return invoices.filter(inv => inv.customerId === viewingCustomer.id);
  }, [invoices, viewingCustomer]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client accounts, contact directories, purchase history, and outstanding balances
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
            title="Print Directory"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, phone, email, GSTIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Customer Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3 text-right">Total Purchases</th>
                <th className="px-4 py-3 text-right">Outstanding Due</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {c.id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-mono">{c.phone}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {c.city}, {c.state}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">
                      {c.gstin ? (
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(c.totalPurchases)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      {c.outstandingAmount > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          {formatCurrency(c.outstandingAmount)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingCustomer(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Invoices & History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCustomer(c);
                            setDeleteError(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* View Customer Details & Invoice History Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">{viewingCustomer.name}</h3>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Contact Info</span>
                <p className="font-bold text-slate-800 mt-1">{viewingCustomer.phone}</p>
                <p className="text-slate-500">{viewingCustomer.email || 'No email'}</p>
                <p className="text-slate-500 mt-0.5">{viewingCustomer.address}, {viewingCustomer.city}</p>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-xs">
                <span className="text-[10px] text-blue-600 uppercase font-semibold block">Total Purchases</span>
                <p className="text-lg font-black font-mono text-blue-900 mt-1">
                  {formatCurrency(viewingCustomer.totalPurchases)}
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">{customerInvoices.length} Invoices generated</p>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                <span className="text-[10px] text-amber-600 uppercase font-semibold block">Outstanding Due</span>
                <p className="text-lg font-black font-mono text-amber-900 mt-1">
                  {formatCurrency(viewingCustomer.outstandingAmount)}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {viewingCustomer.outstandingAmount > 0 ? 'Pending clearance' : 'All accounts settled'}
                </p>
              </div>
            </div>

            {/* Invoice History for this customer */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Invoice History ({customerInvoices.length})
              </h4>
              {customerInvoices.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No invoices billed to this customer yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5">Method</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="px-4 py-2 text-slate-500">{formatDate(inv.date)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold">{formatCurrency(inv.grandTotal)}</td>
                          <td className="px-4 py-2 text-slate-600">{inv.paymentMethod}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => {
                                setViewingCustomer(null);
                                onSelectInvoice(inv);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                            >
                              View A4
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Apex Digital Solutions"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@company.in"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Door No, Street Name, Tech Park"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Chennai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  placeholder="33AAACA1234F1Z8"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <b className="text-slate-900">{deletingCustomer.name}</b>?
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-xs"
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
