import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Receipt,
  QrCode,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Coins,
  Printer
} from 'lucide-react';
import { Invoice, PaymentMethod, BusinessSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { printInvoiceDirect } from '../utils/invoicePrint';

interface BillingPageProps {
  onInvoiceCreated: (invoice: Invoice, autoPrint?: boolean) => void;
  onNavigateTab?: (tab: any) => void;
}

export interface ItemRow {
  id: string;
  itemName: string;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number; // Discount in ₹
  gst: string | number; // GST % (fully typeable)
}

const COMMON_ITEM_SUGGESTIONS = [
  { name: 'Classmate Notebook (192 pgs)', price: 70, gst: 12 },
  { name: 'A4 Copier Paper (500 sheets)', price: 340, gst: 12 },
  { name: 'Ballpoint Pen (Pack of 5)', price: 50, gst: 18 },
  { name: 'Logitech Wireless Mouse', price: 650, gst: 18 },
  { name: 'SanDisk 64GB USB Drive', price: 499, gst: 18 },
  { name: 'Gel Pen Blue (Pack of 10)', price: 120, gst: 18 },
  { name: 'Sticky Notes (3x3 inch)', price: 45, gst: 12 },
  { name: 'Stapler with Pins', price: 95, gst: 18 },
];

const GST_PRESETS = [0, 5, 12, 18, 28];

export const BillingPage: React.FC<BillingPageProps> = ({ onInvoiceCreated }) => {
  // Customer & Bill Metadata States (all freely typeable)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billNotes, setBillNotes] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  // Bill Items Table State
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: 'row-1',
      itemName: 'Classmate Notebook (192 pgs)',
      quantity: '2',
      unitPrice: '70',
      discount: '0',
      gst: '12',
    },
    {
      id: 'row-2',
      itemName: 'Ballpoint Pen (Pack of 5)',
      quantity: '1',
      unitPrice: '50',
      discount: '0',
      gst: '18',
    },
  ]);

  // Overall Discount & Payment
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [cashTendered, setCashTendered] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  // Load business settings for instant receipt printing
  useEffect(() => {
    api.settings.get().then(setBusinessSettings).catch(console.error);
  }, []);

  // Add Item Row
  const handleAddItemRow = (preset?: typeof COMMON_ITEM_SUGGESTIONS[0]) => {
    const newRow: ItemRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemName: preset?.name || '',
      quantity: '1',
      unitPrice: preset ? String(preset.price) : '',
      discount: '0',
      gst: preset ? String(preset.gst) : '18',
    };
    setItems(prev => [...prev, newRow]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (id: string) => {
    if (items.length === 1) {
      setItems([{
        id: `row-${Date.now()}`,
        itemName: '',
        quantity: '1',
        unitPrice: '',
        discount: '0',
        gst: '18',
      }]);
      return;
    }
    setItems(prev => prev.filter(r => r.id !== id));
  };

  // Update Item Row Field
  const handleUpdateRow = (id: string, field: keyof ItemRow, value: string | number) => {
    setItems(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        return { ...row, [field]: value };
      })
    );
  };

  // Handle Item Name change with auto-fill from preset suggestions if matched
  const handleItemNameChange = (id: string, name: string) => {
    const match = COMMON_ITEM_SUGGESTIONS.find(
      s => s.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setItems(prev =>
        prev.map(row => {
          if (row.id !== id) return row;
          return {
            ...row,
            itemName: name,
            unitPrice: String(match.price),
            gst: String(match.gst),
          };
        })
      );
    } else {
      handleUpdateRow(id, 'itemName', name);
    }
  };

  // Reset / Clear Bill to fresh state
  const handleResetBill = (showFeedback: boolean = true) => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setBillNotes('');
    setPaymentRef('');
    setOverallDiscount('0');
    setCashTendered('');
    setPaymentMethod('UPI');
    setItems([
      {
        id: `row-${Date.now()}`,
        itemName: '',
        quantity: '1',
        unitPrice: '',
        discount: '0',
        gst: '18',
      },
    ]);
    if (showFeedback) {
      setSuccessMessage('Bill form reset successfully! All fields cleared for new bill.');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Real-time automatic calculations
  const { subtotal, itemDiscounts, totalGst, grandTotal, computedRows } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    let gstSum = 0;

    const rowDetails = items.map(item => {
      const qtyNum = parseFloat(String(item.quantity).trim());
      const qty = isNaN(qtyNum) ? 0 : Math.max(0, qtyNum);

      const priceNum = parseFloat(String(item.unitPrice).trim());
      const price = isNaN(priceNum) ? 0 : Math.max(0, priceNum);

      const discNum = parseFloat(String(item.discount).trim());
      const rowDisc = isNaN(discNum) ? 0 : Math.max(0, discNum);

      const gstNum = parseFloat(String(item.gst).trim());
      const gstRate = isNaN(gstNum) ? 0 : Math.max(0, gstNum);

      const lineSubtotal = Number((qty * price).toFixed(2));
      const effectiveDisc = Math.min(lineSubtotal, rowDisc);
      const taxable = Math.max(0, Number((lineSubtotal - effectiveDisc).toFixed(2)));
      const gstAmt = Number(((taxable * gstRate) / 100).toFixed(2));
      const lineTotal = Number((taxable + gstAmt).toFixed(2));

      sub += lineSubtotal;
      disc += effectiveDisc;
      tax += taxable;
      gstSum += gstAmt;

      return {
        ...item,
        lineSubtotal,
        effectiveDisc,
        taxable,
        gstAmt,
        lineTotal,
      };
    });

    const extraDiscNum = parseFloat(overallDiscount.trim());
    const extraDisc = isNaN(extraDiscNum) ? 0 : Math.max(0, extraDiscNum);
    const finalGrandTotal = Math.max(0, Number((tax + gstSum - extraDisc).toFixed(2)));

    return {
      subtotal: Number(sub.toFixed(2)),
      itemDiscounts: Number(disc.toFixed(2)),
      totalGst: Number(gstSum.toFixed(2)),
      grandTotal: finalGrandTotal,
      computedRows: rowDetails,
    };
  }, [items, overallDiscount]);

  // Cash Change calculation
  const cashChange = useMemo(() => {
    if (paymentMethod !== 'Cash') return 0;
    const tendered = parseFloat(cashTendered.trim());
    if (isNaN(tendered) || tendered <= 0) return 0;
    return Math.max(0, Number((tendered - grandTotal).toFixed(2)));
  }, [cashTendered, grandTotal, paymentMethod]);

  // Generate Bill action (with optional instant print)
  const handleGenerateBill = async (shouldPrint: boolean = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate items
    const validItems = items.filter(it => it.itemName.trim() !== '');
    if (validItems.length === 0) {
      setErrorMessage('Please enter at least one item name to generate a bill.');
      return;
    }

    setLoading(true);
    try {
      const extraDiscNum = parseFloat(overallDiscount.trim());
      const extraDisc = isNaN(extraDiscNum) ? 0 : Math.max(0, extraDiscNum);

      const billData = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        date: invoiceDate,
        notes: billNotes.trim() || undefined,
        paymentRef: paymentRef.trim() || undefined,
        overallDiscount: extraDisc,
        items: validItems.map(it => {
          const qty = parseFloat(String(it.quantity).trim());
          const price = parseFloat(String(it.unitPrice).trim());
          const disc = parseFloat(String(it.discount).trim());
          const gstVal = parseFloat(String(it.gst).trim());

          return {
            itemName: it.itemName.trim(),
            quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
            unitPrice: isNaN(price) || price < 0 ? 0 : price,
            discount: isNaN(disc) || disc < 0 ? 0 : disc,
            gst: isNaN(gstVal) || gstVal < 0 ? 0 : gstVal,
          };
        }),
        paymentMethod,
      };

      const newInvoice = await api.invoices.create(billData);

      setSuccessMessage(`Invoice ${newInvoice.invoiceNumber} generated successfully!`);

      // Reset billing table for next bill
      handleResetBill(false);

      if (shouldPrint && businessSettings) {
        printInvoiceDirect(newInvoice, businessSettings);
      }

      // Open invoice preview
      onInvoiceCreated(newInvoice, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate bill.');
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'Cash', label: 'Cash', icon: Banknote },
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'Card', label: 'Card / POS', icon: CreditCard },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HTML Datalist for fast item suggestions */}
      <datalist id="common-item-names">
        {COMMON_ITEM_SUGGESTIONS.map(s => (
          <option key={s.name} value={s.name}>
            ₹{s.price} (GST {s.gst}%)
          </option>
        ))}
      </datalist>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Receipt className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">New Bill</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create professional retail shop bills. Type items, price, quantity, customer details, and print receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleResetBill(true)}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Reset Bill Form / Clear All Fields"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Bill</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CUSTOMER & BILL DETAILS CARD (Fully Typeable) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer & Bill Details (Optional)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Type details directly onto bill</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Customer Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Customer Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar / Walk-in"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Mobile / Phone
            </label>
            <input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Bill Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Bill Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Customer Address / Area */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Address / Town
            </label>
            <input
              type="text"
              placeholder="e.g. Anna Nagar, Chennai"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN BILL ITEMS TABLE (Clean, Spacious, No HSN, Typeable Unit Price) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Bill Items Table
            </h2>
            <p className="text-[11px] text-slate-500">
              Type directly in Item Name, Quantity, Unit Price ₹, Discount ₹, and GST (%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddItemRow()}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Item Row</span>
          </button>
        </div>

        {/* Item Rows Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[240px]">Item Name</th>
                <th className="py-3 px-3 w-28 text-center">Quantity</th>
                <th className="py-3 px-3 w-36 text-right">Unit Price ₹</th>
                <th className="py-3 px-3 w-32 text-right">Discount ₹</th>
                <th className="py-3 px-3 w-36 text-center">GST %</th>
                <th className="py-3 px-3 w-32 text-right">Total ₹</th>
                <th className="py-3 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const computed = computedRows[idx] || { lineTotal: 0 };
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors align-top">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold pt-4">
                      {idx + 1}
                    </td>

                    {/* Item Name (Typeable with Suggestions) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        list="common-item-names"
                        placeholder="Type item name (e.g. Notebook, Pen, Bag)..."
                        value={row.itemName}
                        onChange={e => handleItemNameChange(row.id, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </td>

                    {/* Quantity (Freely Typeable) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="1"
                        value={row.quantity}
                        onChange={e => handleUpdateRow(row.id, 'quantity', e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full px-2 py-2 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                        title="Click to type quantity"
                      />
                    </td>

                    {/* Unit Price ₹ (100% Freely Typeable, Instant Focus, No Blocked Overlays) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono pointer-events-none select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={row.unitPrice}
                          onChange={e => handleUpdateRow(row.id, 'unitPrice', e.target.value)}
                          onFocus={e => e.target.select()}
                          className="w-full pl-6 pr-2.5 py-2 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                          title="Click to type unit price"
                        />
                      </div>
                    </td>

                    {/* Discount ₹ (Freely Typeable) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono pointer-events-none select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={row.discount}
                          onChange={e => handleUpdateRow(row.id, 'discount', e.target.value)}
                          onFocus={e => e.target.select()}
                          className="w-full pl-6 pr-2.5 py-2 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                          title="Click to type item discount"
                        />
                      </div>
                    </td>

                    {/* GST % (Typeable + Quick Presets) */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            placeholder="18"
                            value={row.gst}
                            onChange={e => handleUpdateRow(row.id, 'gst', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2 py-1.5 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                            title="Type any GST % rate or click presets below"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none select-none">%</span>
                        </div>
                        {/* Quick Presets Pills */}
                        <div className="flex items-center justify-center gap-1">
                          {GST_PRESETS.map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleUpdateRow(row.id, 'gst', String(r))}
                              className={`px-1 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-colors ${
                                String(row.gst) === String(r)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {r}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 pt-3.5">
                      {formatCurrency(computed.lineTotal)}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-2 text-center pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Item Bottom Row Trigger */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => handleAddItemRow()}
            className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 text-slate-600 hover:text-blue-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Item Row (or Click Quick Suggestions Above)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PAYMENT METHOD, CASH TENDERED & BILL SUMMARY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Payment Method Selection & Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Payment Method & Reference
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select transaction mode and type payment reference / cash tendered.
            </p>
          </div>

          {/* Payment Method Pills */}
          <div className="grid grid-cols-3 gap-3">
            {paymentOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-3.5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* If Cash: Type Cash Received to calculate Change */}
          {paymentMethod === 'Cash' && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" /> Cash Tendered (Customer Given ₹):
                </span>
                <span className="font-mono text-xs text-slate-500">Bill: {formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs pointer-events-none select-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Type cash received (e.g. 500, 2000)..."
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    onFocus={e => e.target.select()}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                {/* Change To Return Badge */}
                <div className="px-3 py-2 bg-white border border-amber-300 rounded-lg text-right min-w-[130px]">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Change To Return</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-700">
                    {formatCurrency(cashChange)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Reference (UPI Transaction ID, Card Approval, Cheque) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Ref / Transaction ID (Typeable)
              </label>
              <input
                type="text"
                placeholder={paymentMethod === 'UPI' ? 'e.g. UPI Ref #987234' : 'e.g. Card Auth #4432 / Cash Ref'}
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Bill Remarks / Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Bill Notes / Remarks (Typeable)
              </label>
              <input
                type="text"
                placeholder="e.g. Counter Sale / Customer PO #12"
                value={billNotes}
                onChange={e => setBillNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Payment Status</span>
              <span className="text-[11px] text-slate-500">Transaction fully settled at billing</span>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider rounded-full border border-emerald-300">
              PAID
            </span>
          </div>
        </div>

        {/* Totals Summary & Generate Bill (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Bill Summary
          </h3>

          <div className="space-y-2.5 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between py-1 text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Item Discounts */}
            {itemDiscounts > 0 && (
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Item Level Discount:</span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(itemDiscounts)}
                </span>
              </div>
            )}

            {/* Overall Discount Input (Freely Typeable) */}
            <div className="flex items-center justify-between py-1 text-slate-700">
              <span className="font-medium">Extra Bill Discount (₹):</span>
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs pointer-events-none select-none">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={overallDiscount}
                  onChange={e => setOverallDiscount(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-full pl-6 pr-2 py-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* GST */}
            <div className="flex justify-between py-1 text-slate-600">
              <span>Total GST:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(totalGst)}
              </span>
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-slate-900">
              <span className="text-sm font-extrabold">Grand Total:</span>
              <span className="text-xl font-extrabold font-mono text-blue-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Action Buttons: [ Print Bill ] [ Generate Bill Only ] */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Print Bill */}
            <button
              type="button"
              onClick={() => handleGenerateBill(true)}
              disabled={loading || grandTotal <= 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Save bill and immediately trigger print dialog for customer receipt"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                  <span>Print Bill ({formatCurrency(grandTotal)})</span>
                </>
              )}
            </button>

            {/* Secondary Generate Bill */}
            <button
              type="button"
              onClick={() => handleGenerateBill(false)}
              disabled={loading || grandTotal <= 0}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-98 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-200"
              title="Save bill and open preview without auto-printing"
            >
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Generate Bill Only</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
