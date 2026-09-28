import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileSpreadsheet,
  Boxes,
  ArrowUpDown,
  X,
  Printer,
  Download
} from 'lucide-react';
import { Product, Category, UnitType } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface ProductsPageProps {
  onOpenRestockModal: (product: Product) => void;
  initialSearch?: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onOpenRestockModal, initialSearch = '' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out, in
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState<UnitType>('pcs');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Delete Confirm
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        api.products.getAll(),
        api.categories.getAll(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    const randomSku = `PRD-${Date.now().toString().slice(-4)}`;
    setSku(randomSku);
    setBarcode('');
    setCategoryId(categories[0]?.id || '');
    setBrand('');
    setDescription('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setGstRate(18);
    setStock(20);
    setMinStock(5);
    setUnit('pcs');
    setStatus('active');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setCategoryId(p.categoryId);
    setBrand(p.brand);
    setDescription(p.description);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setGstRate(p.gstRate);
    setStock(p.stock);
    setMinStock(p.minStock);
    setUnit(p.unit);
    setStatus(p.status);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product Name is required');
      return;
    }
    if (!sku.trim()) {
      setFormError('SKU is required');
      return;
    }
    if (sellingPrice <= 0) {
      setFormError('Selling price must be greater than zero');
      return;
    }

    const cat = categories.find(c => c.id === categoryId);
    const categoryName = cat ? cat.name : 'General';

    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, {
          name,
          sku,
          barcode,
          categoryId,
          categoryName,
          brand,
          description,
          purchasePrice: Number(purchasePrice),
          sellingPrice: Number(sellingPrice),
          gstRate: Number(gstRate),
          stock: Number(stock),
          minStock: Number(minStock),
          unit,
          status,
        });
      } else {
        await api.products.create({
          name,
          sku,
          barcode,
          categoryId,
          categoryName,
          brand,
          description,
          purchasePrice: Number(purchasePrice),
          sellingPrice: Number(sellingPrice),
          gstRate: Number(gstRate),
          stock: Number(stock),
          minStock: Number(minStock),
          unit,
          status,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await api.products.delete(deletingProduct.id);
      setDeletingProduct(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Product ID',
      'Name',
      'SKU',
      'Category',
      'Brand',
      'Purchase Price',
      'Selling Price',
      'GST %',
      'Stock',
      'Min Stock',
      'Unit',
      'Status'
    ];
    const rows = filteredProducts.map(p => [
      p.id,
      p.name,
      p.sku,
      p.categoryName,
      p.brand,
      p.purchasePrice,
      p.sellingPrice,
      p.gstRate,
      p.stock,
      p.minStock,
      p.unit,
      p.status
    ]);
    exportToCSV(`SmartBill_Products_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Brand', 'Selling Price (₹)', 'GST %', 'Stock', 'Unit', 'Status'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.sku,
      p.categoryName,
      p.brand || '-',
      formatCurrency(p.sellingPrice),
      `${p.gstRate}%`,
      p.stock,
      p.unit,
      p.status.toUpperCase(),
    ]);

    printReport(
      'Product Inventory Catalog',
      'Active Stock Items, Pricing & Tax Rates',
      headers,
      rows,
      [
        { label: 'Total Products', value: String(filteredProducts.length) },
        { label: 'Low Stock Items', value: String(filteredProducts.filter(p => p.stock <= p.minStock && p.stock > 0).length) },
        { label: 'Out of Stock', value: String(filteredProducts.filter(p => p.stock === 0).length) },
      ]
    );
  };

  const handleDownloadPDF = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Brand', 'Price (₹)', 'GST %', 'Stock', 'Unit', 'Status'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.sku,
      p.categoryName,
      p.brand || '-',
      formatCurrency(p.sellingPrice),
      `${p.gstRate}%`,
      p.stock,
      p.unit,
      p.status.toUpperCase(),
    ]);

    downloadPDFReport(
      'Product Inventory Catalog',
      'Active Stock Items, Pricing & Tax Rates',
      headers,
      rows,
      [
        { label: 'Total Products', value: String(filteredProducts.length) },
        { label: 'Low Stock Items', value: String(filteredProducts.filter(p => p.stock <= p.minStock && p.stock > 0).length) },
        { label: 'Out of Stock', value: String(filteredProducts.filter(p => p.stock === 0).length) },
      ],
      'products_catalog_report'
    );
  };

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Categories' },
      ...categories.map(c => ({
        value: c.id,
        label: c.name,
        sublabel: c.description,
      }))
    ];
  }, [categories]);

  const stockFilterOptions = [
    { value: 'all', label: 'All Stock Status' },
    { value: 'low', label: 'Low Stock Alerts', badge: 'ALERT', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'out', label: 'Out of Stock (0)', badge: 'EMPTY', badgeColor: 'bg-rose-100 text-rose-800' },
    { value: 'in', label: 'In Stock', badge: 'OK', badgeColor: 'bg-emerald-100 text-emerald-800' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort: Product Name' },
    { value: 'stock', label: 'Sort: Stock Quantity' },
    { value: 'price', label: 'Sort: Selling Price' },
  ];

  const categoryOptions = useMemo(() => {
    return categories.map(c => ({
      value: c.id,
      label: c.name,
      sublabel: c.description,
    }));
  }, [categories]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q);

        const matchesCat = categoryFilter === 'all' || p.categoryId === categoryFilter;

        let matchesStock = true;
        if (stockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= p.minStock;
        else if (stockFilter === 'out') matchesStock = p.stock === 0;
        else if (stockFilter === 'in') matchesStock = p.stock > p.minStock;

        return matchesSearch && matchesCat && matchesStock;
      })
      .sort((a, b) => {
        let valA: any = sortBy === 'price' ? a.sellingPrice : sortBy === 'stock' ? a.stock : a.name.toLowerCase();
        let valB: any = sortBy === 'price' ? b.sellingPrice : sortBy === 'stock' ? b.stock : b.name.toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, search, categoryFilter, stockFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage product inventory, pricing, GST rates, and low-stock alerts
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
            title="Print Catalog"
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
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Product</span>
          </button>
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
              placeholder="Search by product name, SKU, brand..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* Typeable Category Filter */}
          <div>
            <SearchableSelect
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={val => {
                setCategoryFilter(val || 'all');
                setCurrentPage(1);
              }}
              placeholder="Filter by category..."
              searchPlaceholder="Type to filter categories..."
            />
          </div>

          {/* Typeable Stock Level Filter */}
          <div>
            <SearchableSelect
              options={stockFilterOptions}
              value={stockFilter}
              onChange={val => {
                setStockFilter(val || 'all');
                setCurrentPage(1);
              }}
              placeholder="Filter by stock..."
              searchPlaceholder="Type to filter stock..."
            />
          </div>

          {/* Typeable Sort By */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                options={sortOptions}
                value={sortBy}
                onChange={val => setSortBy(val as any)}
                placeholder="Sort by..."
                searchPlaceholder="Type to sort..."
              />
            </div>
            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Product Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Purchase</th>
                <th className="px-4 py-3 text-right">Selling</th>
                <th className="px-4 py-3 text-center">GST %</th>
                <th className="px-4 py-3 text-center">Stock Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    No products found. Click "Add Product" to create one.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  const isOutOfStock = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.brand || 'No Brand'}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-700">
                        {p.gstRate}%
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.stock} {p.unit}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-amber-600 font-semibold mt-0.5">
                              ⚠️ LOW (Min {p.minStock})
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="text-[9px] text-rose-600 font-semibold mt-0.5">
                              🛑 OUT OF STOCK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.status === 'active'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenRestockModal(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Quick Restock / Stock-In"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} items
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Wireless Mouse M235"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU (Stock Keeping Unit) *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value.toUpperCase())}
                    placeholder="LOG-M235-GRY"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <SearchableSelect
                    options={categoryOptions}
                    value={categoryId}
                    onChange={setCategoryId}
                    placeholder="Search or select category..."
                    searchPlaceholder="Type to filter categories..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="Logitech"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <SearchableSelect
                    options={[
                      { value: 'pcs', label: 'Pieces (pcs)' },
                      { value: 'box', label: 'Box (box)' },
                      { value: 'kg', label: 'Kilograms (kg)' },
                      { value: 'g', label: 'Grams (g)' },
                      { value: 'ltr', label: 'Litres (ltr)' },
                      { value: 'meter', label: 'Meters (meter)' },
                      { value: 'pack', label: 'Pack (pack)' },
                      { value: 'set', label: 'Set (set)' },
                    ]}
                    value={unit}
                    onChange={val => setUnit(val as UnitType)}
                    placeholder="Select unit..."
                    searchPlaceholder="Type to filter units..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate *</label>
                  <SearchableSelect
                    options={[
                      { value: '0', label: '0% (Tax Exempt)', badge: 'NIL', badgeColor: 'bg-slate-100 text-slate-600' },
                      { value: '5', label: '5% GST Rate', badge: 'LOW', badgeColor: 'bg-blue-100 text-blue-700' },
                      { value: '12', label: '12% GST Rate', badge: 'STANDARD', badgeColor: 'bg-indigo-100 text-indigo-700' },
                      { value: '18', label: '18% GST Rate (Standard)', badge: 'REGULAR', badgeColor: 'bg-purple-100 text-purple-700' },
                      { value: '28', label: '28% GST Rate (Luxury/High)', badge: 'HIGH', badgeColor: 'bg-rose-100 text-rose-700' },
                    ]}
                    value={String(gstRate)}
                    onChange={val => setGstRate(parseInt(val, 10))}
                    placeholder="Select GST rate..."
                    searchPlaceholder="Type to filter tax rates..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStock}
                    onChange={e => setMinStock(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <SearchableSelect
                    options={[
                      { value: 'active', label: 'Active', badge: 'LIVE', badgeColor: 'bg-emerald-100 text-emerald-800' },
                      { value: 'inactive', label: 'Inactive', badge: 'HIDDEN', badgeColor: 'bg-slate-100 text-slate-600' },
                    ]}
                    value={status}
                    onChange={val => setStatus(val as 'active' | 'inactive')}
                    placeholder="Select status..."
                    searchPlaceholder="Type to filter status..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of product features..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Product</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete <b className="text-slate-900">{deletingProduct.name}</b> (SKU: {deletingProduct.sku})?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-xs"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
