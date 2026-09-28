import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Receipt,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Coins,
  Printer,
  Sparkles,
  ShoppingBag,
  Percent,
  X,
  ArrowRight
} from 'lucide-react';
import { Product, Customer, PaymentMethod, Invoice, BusinessSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface BillingPageProps {
  onInvoiceCreated: (invoice: Invoice) => void;
  onNavigateTab: (tab: any) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onInvoiceCreated, onNavigateTab }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [nextInvoiceNo, setNextInvoiceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Customer Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [custModalError, setCustModalError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, custs, st, nextNo] = await Promise.all([
        api.products.getAll(),
        api.customers.getAll(),
        api.settings.get(),
        api.invoices.getNextInvoiceNumber(),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setSettings(st);
      setNextInvoiceNo(nextNo);

      // Select first walk-in or general customer by default if available
      if (custs.length > 0 && !selectedCustomerId) {
        const defaultCust = custs.find(c => c.name.toLowerCase().includes('walk-in')) || custs[0];
        setSelectedCustomerId(defaultCust.id);
      }
    } catch (err) {
      console.error('Error loading billing setup:', err);
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerOptions = useMemo(() => {
    return customers.map(c => ({
      value: c.id,
      label: c.name,
      sublabel: `${c.phone}${c.city ? ' • ' + c.city : ''}`,
      badge: c.outstandingAmount > 0 ? `Due ₹${c.outstandingAmount}` : undefined,
      badgeColor: c.outstandingAmount > 0 ? 'bg-amber-100 text-amber-800' : undefined,
    }));
  }, [customers]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.categoryName))).filter(Boolean);
    return ['all', ...list];
  }, [products]);

  // Filtered product catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.status !== 'active') return false;
      const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
      const q = productSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, productSearch]);

  // Add Product to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      setError(`"${product.name}" is completely out of stock.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Cannot add more "${product.name}". Only ${product.stock} ${product.unit} available in stock.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice, discountPercent: 0 }];
    });
    setError(null);
  };

  // Update Cart Item Quantity
  const handleUpdateQuantity = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (qty > product.stock) {
      setError(`Cannot exceed available stock of ${product.stock} ${product.unit} for "${product.name}".`);
      return;
    }

    setError(null);
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // Update Item Discount
  const handleUpdateDiscount = (productId: string, disc: number) => {
    const safeDisc = Math.min(100, Math.max(0, disc || 0));
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, discountPercent: safeDisc } : item
      )
    );
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setPaidAmountInput('');
    setError(null);
  };

  // Calculations
  const isInterState = useMemo(() => {
    if (!selectedCustomer || !settings) return false;
    return (
      selectedCustomer.state &&
      settings.state &&
      selectedCustomer.state.trim().toLowerCase() !== settings.state.trim().toLowerCase()
    );
  }, [selectedCustomer, settings]);

  const { subtotal, totalDiscount, taxableAmount, totalCgst, totalSgst, totalIgst, grandTotal } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const item of cart) {
      const lineSub = item.quantity * item.unitPrice;
      const lineDisc = (lineSub * item.discountPercent) / 100;
      const lineTaxable = lineSub - lineDisc;

      sub += lineSub;
      disc += lineDisc;
      tax += lineTaxable;

      if (isInterState) {
        igst += (lineTaxable * item.product.gstRate) / 100;
      } else {
        const half = item.product.gstRate / 2;
        cgst += (lineTaxable * half) / 100;
        sgst += (lineTaxable * half) / 100;
      }
    }

    const grand = tax + cgst + sgst + igst;

    return {
      subtotal: Number(sub.toFixed(2)),
      totalDiscount: Number(disc.toFixed(2)),
      taxableAmount: Number(tax.toFixed(2)),
      totalCgst: Number(cgst.toFixed(2)),
      totalSgst: Number(sgst.toFixed(2)),
      totalIgst: Number(igst.toFixed(2)),
      grandTotal: Number(grand.toFixed(2)),
    };
  }, [cart, isInterState]);

  // Paid amount calculation
  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'Credit') return 0;
    if (paidAmountInput === '') return grandTotal; // Default to full payment for Cash/UPI/Card
    const parsed = parseFloat(paidAmountInput);
    return isNaN(parsed) ? 0 : Math.min(parsed, grandTotal);
  }, [paidAmountInput, grandTotal, paymentMethod]);

  const balanceDue = Math.max(0, Number((grandTotal - effectivePaidAmount).toFixed(2)));

  // Handle Quick Add Customer
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setCustModalError('Customer name is required');
      return;
    }
    if (!newCustPhone.trim()) {
      setCustModalError('Phone number is required');
      return;
    }

    try {
      const newCust = await api.customers.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        address: newCustAddress.trim(),
        city: newCustCity.trim() || 'Chennai',
        state: settings?.state || 'Tamil Nadu',
        gstin: newCustGstin.trim(),
      });

      setCustomers(prev => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      setShowNewCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustAddress('');
      setNewCustGstin('');
      setCustModalError(null);
    } catch (err: any) {
      setCustModalError(err.message || 'Failed to create customer');
    }
  };

  // Submit Invoice Creation
  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) {
      setError('Please select or create a customer first.');
      return;
    }
    if (cart.length === 0) {
      setError('Please add at least one product to the cart.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await api.invoices.create({
        customerId: selectedCustomerId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
        })),
        paymentMethod,
        paidAmount: effectivePaidAmount,
        notes: invoiceNotes,
      });

      // Clear state and notify
      setCart([]);
      setPaidAmountInput('');
      setInvoiceNotes('');
      await loadData();
      onInvoiceCreated(created);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate invoice. Please check stock levels.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'Cash', label: 'Cash', icon: Banknote },
    { id: 'Card', label: 'Card / POS', icon: CreditCard },
    { id: 'Bank Transfer', label: 'Bank / NEFT', icon: Building },
    { id: 'Credit', label: 'Credit (Pay Later)', icon: Coins },
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Banner with Invoice Counter & Customer Selection */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">Point of Sale (POS)</h1>
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                {nextInvoiceNo || 'INV-2026-XXXXX'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">Fast checkout, real-time stock verification & tax computation</p>
          </div>
        </div>

        {/* Customer Selector & Add Customer Modal Trigger */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72 min-w-[220px]">
            <SearchableSelect
              options={customerOptions}
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              placeholder="Search or select customer..."
              searchPlaceholder="Type customer name, phone, city..."
            />
          </div>

          <button
            onClick={() => setShowNewCustomerModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            title="Add New Customer"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Product Catalog & Quick Search (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col h-[750px]">
          {/* Search & Category Filter Bar */}
          <div className="space-y-3 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by Name, SKU, Brand or scan barcode..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
                <p>No products match your search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredProducts.map(p => {
                  const inCartItem = cart.find(item => item.product.id === p.id);
                  const isOutOfStock = p.stock <= 0;
                  const isLow = p.stock <= p.minStock && !isOutOfStock;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && handleAddToCart(p)}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-md cursor-pointer group active:scale-[0.99]'
                      } ${inCartItem ? 'ring-2 ring-blue-500/80 bg-blue-50/20' : ''}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                            {p.categoryName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isOutOfStock ? '0 IN STOCK' : `${p.stock} ${p.unit}`}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          SKU: {p.sku} • GST: {p.gstRate}%
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-sm font-extrabold font-mono text-slate-900">
                          {formatCurrency(p.sellingPrice)}
                        </span>

                        {inCartItem ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                            In Cart ({inCartItem.quantity})
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 flex items-center justify-center text-xs transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Table & Checkout Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col h-[750px]">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Cart Items ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear Cart
              </button>
            )}
          </div>

          {/* Cart Table Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1">
            {cart.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 text-slate-300 mb-1" />
                <p className="font-medium">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400">Click products from the catalog to add items</p>
              </div>
            ) : (
              cart.map(item => {
                const lineTotal =
                  (item.quantity * item.unitPrice * (100 - item.discountPercent)) / 100 *
                  (1 + item.product.gstRate / 100);

                return (
                  <div key={item.product.id} className="py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(item.unitPrice)} each • GST {item.product.gstRate}%
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      {/* Qty Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 font-mono font-bold text-xs text-slate-800 bg-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Discount Input */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>Disc %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || ''}
                          onChange={e => handleUpdateDiscount(item.product.id, parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-12 px-1.5 py-0.5 text-center text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white font-mono"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing Calculation Summary Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable Value:</span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(taxableAmount)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-slate-500">
                <span>IGST (Interstate):</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(totalIgst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST:</span>
                  <span className="font-mono">{formatCurrency(totalCgst)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST:</span>
                  <span className="font-mono">{formatCurrency(totalSgst)}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-base text-blue-600 font-mono">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-3 space-y-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentMethods.map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id === 'Credit') {
                        setPaidAmountInput('0');
                      } else {
                        setPaidAmountInput(grandTotal.toString());
                      }
                    }}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Paid Amount & Balance Due Inputs */}
            {paymentMethod !== 'Credit' && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 font-medium">Amount Received</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={grandTotal.toString()}
                    value={paidAmountInput}
                    onChange={e => setPaidAmountInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 font-medium">Balance Due</label>
                  <div
                    className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border ${
                      balanceDue > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Create & Print Bill */}
          <div className="mt-4 pt-2">
            <button
              onClick={handleCreateInvoice}
              disabled={loading || cart.length === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Generate & Print Invoice ({formatCurrency(grandTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {custModalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">
                {custModalError}
              </div>
            )}

            <form onSubmit={handleSaveNewCustomer} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Hardware Supplies"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={e => setNewCustEmail(e.target.value)}
                    placeholder="contact@store.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="Door No, Street Name, Area"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={e => setNewCustCity(e.target.value)}
                    placeholder="Chennai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newCustGstin}
                    onChange={e => setNewCustGstin(e.target.value.toUpperCase())}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
