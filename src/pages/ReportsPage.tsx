import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  TrendingUp,
  Percent,
  Receipt,
  Wallet,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  PieChart as PieIcon,
  Tag,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { Invoice, Product, Customer } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'year' | 'all'>('30days');
  const [activeReportTab, setActiveReportTab] = useState<'sales' | 'gst' | 'products' | 'customers'>('sales');

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [invs, prods, custs] = await Promise.all([
        api.invoices.getAll(),
        api.products.getAll(),
        api.customers.getAll(),
      ]);
      setInvoices(invs);
      setProducts(prods);
      setCustomers(custs);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices based on time range
  const filteredInvoices = useMemo(() => {
    const active = invoices.filter(inv => inv.status !== 'cancelled');
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return active.filter(inv => {
      const invDate = new Date(inv.date);
      if (timeRange === 'today') {
        return inv.date === todayStr;
      }
      if (timeRange === '7days') {
        const diff = (now.getTime() - invDate.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (timeRange === '30days') {
        const diff = (now.getTime() - invDate.getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      if (timeRange === 'year') {
        return invDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [invoices, timeRange]);

  // Overall Metrics
  const totalInvoices = filteredInvoices.length;
  const totalSales = filteredInvoices.reduce((a, b) => a + b.grandTotal, 0);
  const totalTaxable = filteredInvoices.reduce((a, b) => a + b.taxableAmount, 0);
  const totalTax = filteredInvoices.reduce((a, b) => a + (b.totalCgst + b.totalSgst + b.totalIgst), 0);
  const totalDiscount = filteredInvoices.reduce((a, b) => a + b.totalDiscount, 0);
  const totalCollected = filteredInvoices.reduce((a, b) => a + b.paidAmount, 0);
  const totalPending = filteredInvoices.reduce((a, b) => a + b.balanceAmount, 0);

  // GST Liability breakdown
  const gstBreakdown = useMemo(() => {
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const inv of filteredInvoices) {
      cgst += inv.totalCgst;
      sgst += inv.totalSgst;
      igst += inv.totalIgst;
    }
    return {
      cgst,
      sgst,
      igst,
      totalGst: cgst + sgst + igst,
    };
  }, [filteredInvoices]);

  // Product sales performance aggregation
  const productPerformance = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();

    for (const inv of filteredInvoices) {
      for (const item of inv.items) {
        const cur = map.get(item.productId) || {
          name: item.productName,
          sku: item.sku,
          qty: 0,
          revenue: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += item.totalAmount;
        map.set(item.productId, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // Customer sales performance aggregation
  const customerPerformance = useMemo(() => {
    const map = new Map<string, { name: string; invoices: number; spent: number; pending: number }>();

    for (const inv of filteredInvoices) {
      const cur = map.get(inv.customerId) || {
        name: inv.customerName,
        invoices: 0,
        spent: 0,
        pending: 0,
      };
      cur.invoices += 1;
      cur.spent += inv.grandTotal;
      cur.pending += inv.balanceAmount;
      map.set(inv.customerId, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [filteredInvoices]);

  const handleExportCSV = () => {
    if (activeReportTab === 'gst') {
      const headers = ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total GST', 'Grand Total'];
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.customerGstin || 'Unregistered',
        inv.taxableAmount,
        inv.totalCgst,
        inv.totalSgst,
        inv.totalIgst,
        (inv.totalCgst + inv.totalSgst + inv.totalIgst).toFixed(2),
        inv.grandTotal
      ]);
      exportToCSV(`SmartBill_GST_Report_${timeRange}`, headers, rows);
    } else if (activeReportTab === 'products') {
      const headers = ['Product Name', 'SKU', 'Units Sold', 'Total Revenue'];
      const rows = productPerformance.map(p => [p.name, p.sku, p.qty, p.revenue.toFixed(2)]);
      exportToCSV(`SmartBill_Product_Sales_${timeRange}`, headers, rows);
    } else if (activeReportTab === 'customers') {
      const headers = ['Customer Name', 'Invoices Generated', 'Total Volume', 'Pending Due'];
      const rows = customerPerformance.map(c => [c.name, c.invoices, c.spent.toFixed(2), c.pending.toFixed(2)]);
      exportToCSV(`SmartBill_Customer_Performance_${timeRange}`, headers, rows);
    } else {
      const headers = ['Invoice No', 'Date', 'Customer', 'Grand Total', 'Paid', 'Balance Due', 'Status', 'Payment Method'];
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.grandTotal,
        inv.paidAmount,
        inv.balanceAmount,
        inv.paymentStatus,
        inv.paymentMethod
      ]);
      exportToCSV(`SmartBill_Sales_Summary_${timeRange}`, headers, rows);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportContentRef.current) return;
    setIsExportingPDF(true);
    try {
      const element = reportContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 297; // A4 landscape width mm
      const pageHeight = 210; // A4 landscape height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`SmartBill_Report_${activeReportTab}_${timeRange}.pdf`);
    } catch (err) {
      console.error('Report PDF export error:', err);
      alert('Could not export PDF. Falling back to print...');
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const printContent = reportContentRef.current;
      if (!printContent) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SmartBill Report - ${activeReportTab.toUpperCase()}</title>
              <style>
                @page { size: landscape; margin: 10mm; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 10px; margin: 0; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th, td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
                th { background-color: #f8fafc; font-weight: bold; text-align: left; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .font-mono { font-family: monospace; }
              </style>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body>
              <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">SMART BILL - ${activeReportTab.toUpperCase()} REPORT</h2>
              <p style="font-size: 11px; color: #64748b; margin-bottom: 16px;">Timeframe: ${timeRange.toUpperCase()} • Generated on: ${new Date().toLocaleDateString()}</p>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              setIsPrinting(false);
            }, 1000);
          }
        }, 400);
      } else {
        window.print();
        setIsPrinting(false);
      }
    } catch {
      window.print();
      setIsPrinting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Business Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready financial statements, GST filings, and sales performance analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Download High-Res PDF"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </>
            )}
          </button>

          {/* Print Report */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Print Report"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'year', label: 'This Financial Year' },
            { id: 'all', label: 'All Records' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                timeRange === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredInvoices.length} Invoices
        </span>
      </div>

      {/* Metric KPI Cards (6 metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">{formatCurrency(totalSales)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Value</span>
          <div className="text-lg font-black text-slate-700 font-mono mt-1">{formatCurrency(totalTaxable)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total GST (Tax)</span>
          <div className="text-lg font-black text-blue-600 font-mono mt-1">{formatCurrency(totalTax)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Discounts</span>
          <div className="text-lg font-black text-emerald-600 font-mono mt-1">{formatCurrency(totalDiscount)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Collected</span>
          <div className="text-lg font-black text-teal-600 font-mono mt-1">{formatCurrency(totalCollected)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Due</span>
          <div className="text-lg font-black text-amber-600 font-mono mt-1">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      {/* Report Sub-tabs: Sales, GST, Products, Customers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 flex items-center gap-4 overflow-x-auto text-xs">
          {[
            { id: 'sales', label: 'Sales & Invoices Report', icon: Receipt },
            { id: 'gst', label: 'GST Tax Liability (GSTR-1)', icon: ShieldCheck },
            { id: 'products', label: 'Product Sales Volume', icon: Tag },
            { id: 'customers', label: 'Customer Purchase Volume', icon: PieIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`pb-3 font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div ref={reportContentRef} className="p-5 bg-white">
          {/* Tab 1: Sales Summary */}
          {activeReportTab === 'sales' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Taxable</th>
                      <th className="px-4 py-3 text-right">GST</th>
                      <th className="px-4 py-3 text-right">Grand Total</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{inv.customerName}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(inv.taxableAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatCurrency(inv.totalCgst + inv.totalSgst + inv.totalIgst)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                        <td className="px-4 py-3 text-slate-700">{inv.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: GST Liability */}
          {activeReportTab === 'gst' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Taxable Turnover</span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{formatCurrency(totalTaxable)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600">CGST (Central Tax)</span>
                  <div className="text-xl font-black text-blue-900 font-mono mt-0.5">{formatCurrency(gstBreakdown.cgst)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600">SGST (State Tax)</span>
                  <div className="text-xl font-black text-blue-900 font-mono mt-0.5">{formatCurrency(gstBreakdown.sgst)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-600">IGST (Integrated Tax)</span>
                  <div className="text-xl font-black text-purple-900 font-mono mt-0.5">{formatCurrency(gstBreakdown.igst)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">GSTIN</th>
                      <th className="px-4 py-3 text-right">Taxable Value</th>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-4 py-3 text-right">SGST</th>
                      <th className="px-4 py-3 text-right">IGST</th>
                      <th className="px-4 py-3 text-right">Total GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{inv.customerName}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          {inv.customerGstin || <span className="text-slate-400">Unregistered B2C</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800">{formatCurrency(inv.taxableAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(inv.totalCgst)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(inv.totalSgst)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(inv.totalIgst)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                          {formatCurrency(inv.totalCgst + inv.totalSgst + inv.totalIgst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Product Sales Volume */}
          {activeReportTab === 'products' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3 text-center">Units Sold</th>
                      <th className="px-4 py-3 text-right">Total Revenue Billed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productPerformance.map((p, idx) => (
                      <tr key={p.sku} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{p.sku}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-blue-600">{p.qty}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Customer Performance */}
          {activeReportTab === 'customers' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3 text-center">Invoices Billed</th>
                      <th className="px-4 py-3 text-right">Total Billing Volume</th>
                      <th className="px-4 py-3 text-right">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerPerformance.map(c => (
                      <tr key={c.name} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-blue-600">{c.invoices}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(c.spent)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {c.pending > 0 ? (
                            <span className="text-amber-600">{formatCurrency(c.pending)}</span>
                          ) : (
                            <span className="text-emerald-600">₹0.00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
