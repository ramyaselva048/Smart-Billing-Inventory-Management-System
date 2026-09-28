import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Package,
  X,
  CheckCircle2,
  Printer,
  Download
} from 'lucide-react';
import { Product, StockTransaction, StockTransactionType } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface InventoryPageProps {
  initialRestockProduct?: Product | null;
  onClearInitialRestock?: () => void;
  initialSearch?: string;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  initialRestockProduct,
  onClearInitialRestock,
  initialSearch = '',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [filterType, setFilterType] = useState<string>('all'); // all, low, out

  // Stock In / Adjustment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [operationType, setOperationType] = useState<'IN' | 'ADJUSTMENT'>('IN');
  const [qtyValue, setQtyValue] = useState<number>(10);
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialRestockProduct) {
      setSelectedProductId(initialRestockProduct.id);
      setOperationType('IN');
      setQtyValue(initialRestockProduct.minStock * 2 || 20);
      setReason(`Restocking low stock item: ${initialRestockProduct.name}`);
      setModalOpen(true);
      if (onClearInitialRestock) onClearInitialRestock();
    }
  }, [initialRestockProduct]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, txns] = await Promise.all([
        api.products.getAll(),
        api.inventory.getTransactions(),
      ]);
      setProducts(prods);
      setTransactions(txns);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStockIn = (p?: Product) => {
    if (p) setSelectedProductId(p.id);
    setOperationType('IN');
    setQtyValue(20);
    setReason('Supplier delivery shipment received');
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenAdjustment = (p?: Product) => {
    if (p) {
      setSelectedProductId(p.id);
      setQtyValue(p.stock);
    }
    setOperationType('ADJUSTMENT');
    setReason('Physical audit correction / shelf count');
    setModalError(null);
    setModalOpen(true);
  };

  const handleExecuteStockAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setModalError('Please select a product');
      return;
    }
    if (!reason.trim()) {
      setModalError('Please state a reason for audit tracking');
      return;
    }

    try {
      setActionLoading(true);
      setModalError(null);

      if (operationType === 'IN') {
        if (qtyValue <= 0) {
          setModalError('Stock-In quantity must be greater than zero');
          return;
        }
        await api.inventory.stockIn(selectedProductId, Number(qtyValue), reason.trim());
      } else {
        if (qtyValue < 0) {
          setModalError('New stock quantity cannot be negative');
          return;
        }
        await api.inventory.stockAdjustment(selectedProductId, Number(qtyValue), reason.trim());
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'levels') {
      const headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Min Level', 'Unit', 'Status'];
      const rows = filteredProducts.map(p => [
        p.name,
        p.sku,
        p.categoryName,
        p.stock,
        p.minStock,
        p.unit,
        p.stock === 0 ? 'OUT OF STOCK' : p.stock <= p.minStock ? 'LOW STOCK' : 'OK'
      ]);
      exportToCSV(`SmartBill_Inventory_Stock_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else {
      const headers = ['Txn ID', 'Product', 'SKU', 'Type', 'Qty Delta', 'Prev Stock', 'New Stock', 'Reason', 'User', 'Date'];
      const rows = transactions.map(t => [
        t.id,
        t.productName,
        t.sku,
        t.type,
        t.quantity,
        t.previousStock,
        t.newStock,
        t.reason,
        t.createdByName,
        formatDateTime(t.createdAt)
      ]);
      exportToCSV(`SmartBill_Stock_Transactions_${new Date().toISOString().split('T')[0]}`, headers, rows);
    }
  };

  const handlePrint = () => {
    if (activeTab === 'levels') {
      const headers = ['Product Name', 'SKU', 'Stock Level', 'Min Threshold', 'Unit', 'Status'];
      const rows = filteredProducts.map(p => [
        p.name,
        p.sku,
        p.stock,
        p.minStock,
        p.unit,
        p.stock === 0 ? 'OUT OF STOCK' : p.stock <= p.minStock ? 'LOW STOCK' : 'IN STOCK',
      ]);

      printReport(
        'Warehouse Inventory Report',
        'Live Product Stock Levels, Minimum Thresholds & Status',
        headers,
        rows,
        [
          { label: 'Total Catalog SKUs', value: String(totalSKUs) },
          { label: 'Low Stock Alerts', value: String(lowCount) },
          { label: 'Out of Stock Items', value: String(outCount) },
        ]
      );
    } else {
      const headers = ['Type', 'Product', 'SKU', 'Quantity', 'Stock Before/After', 'Reason / Ref', 'User', 'Date'];
      const rows = transactions.map(t => [
        t.type,
        t.productName,
        t.sku,
        t.quantity,
        `${t.previousStock} -> ${t.newStock}`,
        t.reason || '-',
        t.createdByName,
        formatDateTime(t.createdAt),
      ]);

      printReport(
        'Stock Transaction Ledger',
        'Full Warehouse Intake, Sales Deductions & Adjustments Audit',
        headers,
        rows
      );
    }
  };

  const handleDownloadPDF = () => {
    if (activeTab === 'levels') {
      const headers = ['Product Name', 'SKU', 'Stock', 'Threshold', 'Unit', 'Status'];
      const rows = filteredProducts.map(p => [
        p.name,
        p.sku,
        p.stock,
        p.minStock,
        p.unit,
        p.stock === 0 ? 'OUT OF STOCK' : p.stock <= p.minStock ? 'LOW STOCK' : 'IN STOCK',
      ]);

      downloadPDFReport(
        'Warehouse Inventory Report',
        'Live Product Stock Levels, Minimum Thresholds & Status',
        headers,
        rows,
        [
          { label: 'Total Catalog SKUs', value: String(totalSKUs) },
          { label: 'Low Stock Alerts', value: String(lowCount) },
          { label: 'Out of Stock Items', value: String(outCount) },
        ],
        'warehouse_inventory_report'
      );
    } else {
      const headers = ['Type', 'Product', 'SKU', 'Qty', 'Before/After', 'Reason', 'User', 'Date'];
      const rows = transactions.map(t => [
        t.type,
        t.productName,
        t.sku,
        t.quantity,
        `${t.previousStock} -> ${t.newStock}`,
        t.reason || '-',
        t.createdByName,
        formatDateTime(t.createdAt),
      ]);

      downloadPDFReport(
        'Stock Transaction Ledger',
        'Full Warehouse Intake, Sales Deductions & Adjustments Audit',
        headers,
        rows,
        undefined,
        'stock_transactions_ledger'
      );
    }
  };

  const productOptions = useMemo(() => {
    return products.map(p => ({
      value: p.id,
      label: p.name,
      sublabel: `SKU: ${p.sku}`,
      badge: p.stock === 0 ? 'Out of Stock' : `${p.stock} ${p.unit}`,
      badgeColor: p.stock === 0 ? 'bg-rose-100 text-rose-800' : p.stock <= p.minStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      let matchesFilter = true;
      if (filterType === 'low') matchesFilter = p.stock > 0 && p.stock <= p.minStock;
      else if (filterType === 'out') matchesFilter = p.stock === 0;
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filterType]);

  const totalSKUs = products.length;
  const lowCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outCount = products.filter(p => p.stock === 0).length;

  const stockFilterOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'low', label: 'Low Stock Only', badge: 'LOW', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'out', label: 'Out of Stock Only', badge: 'ZERO', badgeColor: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory & Stock Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time warehouse tracking, intake logs, and automated audit adjustments
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
            title="Print Inventory Report"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => handleOpenStockIn()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Stock In (+Intake)
          </button>
          <button
            onClick={() => handleOpenAdjustment()}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Adjust Stock Level
          </button>
        </div>
      </div>

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Cataloged SKUs</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{totalSKUs}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Low Stock Warnings</span>
            <div className="text-xl font-black text-amber-600 font-mono mt-0.5">{lowCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Out of Stock (Zero)</span>
            <div className="text-xl font-black text-rose-600 font-mono mt-0.5">{outCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('levels')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'levels'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current Stock Levels ({filteredProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Stock Transaction History ({transactions.length})
            </button>
          </div>

          {/* Search & Stock Filter */}
          {activeTab === 'levels' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search product or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="w-48">
                <SearchableSelect
                  options={stockFilterOptions}
                  value={filterType}
                  onChange={val => setFilterType(val || 'all')}
                  placeholder="Filter stock..."
                  searchPlaceholder="Type to filter..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'levels' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Stock Level</th>
                  <th className="px-4 py-3 text-center">Threshold</th>
                  <th className="px-4 py-3">Health Status</th>
                  <th className="px-5 py-3 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isOut = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const percentOfMin = Math.min(100, Math.round((p.stock / (p.minStock * 2 || 10)) * 100));

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.brand}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {p.categoryName}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {p.stock}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500 font-mono">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span
                              className={
                                isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                              }
                            >
                              {isOut ? 'Depleted' : isLow ? 'Low Stock' : 'Good'}
                            </span>
                            <span className="text-slate-400 font-mono">{percentOfMin}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOut
                                  ? 'bg-rose-500 w-0'
                                  : isLow
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentOfMin}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenStockIn(p)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            + Intake
                          </button>
                          <button
                            onClick={() => handleOpenAdjustment(p)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Reconcile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Transaction History Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Txn Date</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty Changed</th>
                  <th className="px-4 py-3 text-right">Prev → New</th>
                  <th className="px-4 py-3">Reason / Reference</th>
                  <th className="px-5 py-3 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => {
                    const isPositive = t.quantity > 0 && t.type !== 'OUT';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(t.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{t.productName}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{t.sku}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.type === 'OUT'
                                ? 'bg-blue-100 text-blue-800'
                                : t.type === 'RETURN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? `+${t.quantity}` : t.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {t.previousStock} → <b className="text-slate-900">{t.newStock}</b>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.reason}
                          {t.invoiceNumber && (
                            <span className="font-mono text-blue-600 ml-1">({t.invoiceNumber})</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">{t.createdByName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock In / Reconcile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {operationType === 'IN' ? 'Intake / Stock In Products' : 'Adjust / Reconcile Stock'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleExecuteStockAction} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  placeholder="Search product or SKU..."
                  searchPlaceholder="Type product name or SKU to search..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOperationType('IN')}
                    className={`py-2 rounded-xl font-bold border text-center transition-all ${
                      operationType === 'IN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Stock-In (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationType('ADJUSTMENT')}
                    className={`py-2 rounded-xl font-bold border text-center transition-all ${
                      operationType === 'ADJUSTMENT'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Reconcile Level
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {operationType === 'IN' ? 'Quantity to Add *' : 'New Absolute Stock Quantity *'}
                </label>
                <input
                  type="number"
                  required
                  min={operationType === 'IN' ? '1' : '0'}
                  value={qtyValue}
                  onChange={e => setQtyValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Reference Note *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Supplier PO #4401 received or Audit discrepancy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
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
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Inventory...' : 'Confirm Stock Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
