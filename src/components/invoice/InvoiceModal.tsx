import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Plus,
  X,
  Receipt,
  Loader2,
  CheckCircle2,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../../types';
import {
  formatCurrency,
  formatReceiptDate,
  formatReceiptDateTime,
  numberToWordsINR
} from '../../utils/formatters';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import { printInvoiceDirect } from '../../utils/invoicePrint';

interface InvoiceModalProps {
  invoice: Invoice | null;
  settings: BusinessSettings;
  autoPrint?: boolean;
  onClose: () => void;
  onCreateNewBill?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  settings,
  autoPrint = false,
  onClose,
  onCreateNewBill,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Auto trigger print when requested (e.g. from Print Bill button on billing page)
  useEffect(() => {
    if (autoPrint && invoice) {
      handlePrint();
    }
  }, [autoPrint, invoice?.id]);

  if (!invoice) return null;

  // Handle PDF Generation (Vector A4 / Receipt style, exact filename Invoice-INV-2026-00001.pdf)
  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    try {
      generateInvoicePDF(invoice, settings);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Handle Print (Direct clean print utility working on laptops & desktops)
  const handlePrint = () => {
    setIsPrinting(true);
    setPrintFeedback('Opening laptop printer dialog...');
    try {
      const res = printInvoiceDirect(invoice, settings);
      if (res.method === 'pdf') {
        setPrintFeedback('Direct print unavailable: Vector PDF downloaded & ready for print!');
      } else {
        setPrintFeedback('Printer dialog opened successfully!');
      }
    } catch (err) {
      console.error('Print failure, falling back to PDF:', err);
      generateInvoicePDF(invoice, settings);
      setPrintFeedback('Saved as PDF for direct printing.');
    } finally {
      setTimeout(() => setIsPrinting(false), 600);
      setTimeout(() => setPrintFeedback(null), 4000);
    }
  };

  // Handle New Bill Click
  const handleNewBillClick = () => {
    onClose();
    if (onCreateNewBill) {
      onCreateNewBill();
    }
  };

  // Quick Copy Text Receipt for WhatsApp / SMS / Email
  const handleCopyReceiptSummary = async () => {
    const lines = [
      `*${settings.businessName || 'SMART BILL'}*`,
      `Tax Invoice: ${invoice.invoiceNumber}`,
      `Date: ${formatReceiptDate(invoice.date)}`,
      `Payment: ${invoice.paymentMethod} (PAID)`,
      '--------------------------------',
      ...invoice.items.map(it => `${it.itemName} x ${it.quantity} = ₹${it.total.toFixed(2)}`),
      '--------------------------------',
      `Subtotal: ₹${invoice.subtotal.toFixed(2)}`,
      ...(invoice.discount > 0 ? [`Discount: -₹${invoice.discount.toFixed(2)}`] : []),
      `GST: ₹${invoice.gst.toFixed(2)}`,
      `*GRAND TOTAL: ₹${invoice.grandTotal.toFixed(2)}*`,
      '--------------------------------',
      'Status: PAYMENT COMPLETED (PAID)',
      'Thank you for your purchase!'
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* ========================================================= */}
        {/* Top Control Bar with 3 IMPORTANT BUTTONS (Hidden when printing) */}
        {/* ========================================================= */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between gap-3 shrink-0 print:hidden flex-wrap border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">
                  Invoice <span className="font-mono text-cyan-400 font-extrabold">{invoice.invoiceNumber}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PAID
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Retail Shop Bill Preview</p>
            </div>
          </div>

          {/* Action Buttons: [ Download PDF ] [ Print Bill ] [ New Bill ] */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Download vector PDF invoice"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            {/* Print Bill */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-slate-700 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Print Bill"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Print Bill</span>
            </button>

            {/* New Bill */}
            <button
              onClick={handleNewBillClick}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:shadow-emerald-600/20 active:scale-95 cursor-pointer"
              title="Start a New Bill"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Bill</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status notification toast */}
        {printFeedback && (
          <div className="bg-cyan-500/20 border-b border-cyan-500/40 text-cyan-300 text-xs py-2 px-4 flex items-center justify-between print:hidden animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>{printFeedback}</span>
            </span>
            <span className="text-[11px] text-cyan-400 font-mono">Invoice {invoice.invoiceNumber}</span>
          </div>
        )}

        {exportSuccess && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2 px-4 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              PDF generated successfully as <b className="font-mono">Invoice-{invoice.invoiceNumber}.pdf</b>
            </span>
            <span className="text-[11px] text-emerald-400">Ready to share via WhatsApp / Email</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* Scrollable Printable Bill Container */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-900/60 print:bg-white print:p-0 custom-scrollbar">
          
          {/* Authentic Retail Shop Bill / Receipt */}
          <div
            ref={printRef}
            id="printable-invoice"
            className="bg-white text-slate-900 rounded-xl max-w-[540px] mx-auto p-6 sm:p-8 shadow-xl print:shadow-none print:border-none print:max-w-none print:w-full font-mono text-xs border border-slate-200"
          >
            {/* ------------------------------------------------ */}
            {/* SHOP HEADER (Centered) */}
            {/* ------------------------------------------------ */}
            <div className="text-center space-y-1 pb-3">
              <div className="inline-block px-3 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider mb-1">
                RETAIL TAX INVOICE
              </div>
              
              <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans uppercase">
                SMART BILL
              </h1>
              
              <p className="text-[11px] font-medium text-slate-500 font-sans tracking-wide">
                Billing & Invoice System
              </p>

              {/* Business Name */}
              <div className="pt-2">
                <h2 className="text-base font-bold text-slate-900 font-sans">
                  {settings.businessName || 'Retail Store'}
                </h2>
                <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-tight mt-0.5">
                  {settings.businessAddress || 'Business Address'}
                </p>
                <div className="text-[11px] text-slate-700 pt-1 space-x-2">
                  <span>Phone: <b className="font-mono">{settings.phone || 'N/A'}</b></span>
                  <span>•</span>
                  <span>GSTIN: <b className="font-mono">{settings.gstNumber || 'N/A'}</b></span>
                </div>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-slate-400 my-3" />

            {/* ------------------------------------------------ */}
            {/* INVOICE METADATA */}
            {/* ------------------------------------------------ */}
            <div className="grid grid-cols-2 gap-2 text-[11.5px] py-1">
              <div>
                <span className="text-slate-500">Invoice No: </span>
                <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date: </span>
                <span className="font-bold text-slate-900">
                  {formatReceiptDate(invoice.date)}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Payment: </span>
                <span className="font-bold text-slate-900">{invoice.paymentMethod}</span>
                {invoice.paymentRef && (
                  <span className="text-slate-500 text-[10px] block font-mono">Ref: {invoice.paymentRef}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-500">Status: </span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                  PAID
                </span>
              </div>

              <div className="col-span-2 text-[10px] text-slate-400 pt-0.5">
                Time: {formatReceiptDateTime(invoice.createdAt || invoice.date)}
              </div>

              {/* Customer Info (if typed) */}
              {(invoice.customerName || invoice.customerPhone || invoice.customerAddress) && (
                <div className="col-span-2 pt-1 border-t border-dotted border-slate-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Customer:{' '}
                      <b className="text-slate-900">{invoice.customerName || 'Walk-in Customer'}</b>
                    </span>
                    {invoice.customerPhone && (
                      <span className="font-mono text-slate-700">Phone: {invoice.customerPhone}</span>
                    )}
                  </div>
                  {invoice.customerAddress && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Address: {invoice.customerAddress}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-slate-400 my-3" />

            {/* ------------------------------------------------ */}
            {/* ITEMS TABLE */}
            {/* ------------------------------------------------ */}
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-dashed border-slate-400 text-slate-800 font-bold uppercase text-[10.5px]">
                  <th className="pb-2 text-left">Item</th>
                  <th className="pb-2 text-center w-12">Qty</th>
                  <th className="pb-2 text-right w-20">Price</th>
                  <th className="pb-2 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="align-top">
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-900 text-[11.5px]">
                        {item.itemName}
                      </div>
                      {/* Secondary item details (GST & Discount) */}
                      {(item.discount > 0 || (item.gst && item.gst > 0)) && (
                        <div className="text-[10px] text-slate-500">
                          {item.gst ? `GST: ${item.gst}%` : ''}
                          {item.discount > 0 ? ` • Disc: -${formatCurrency(item.discount)}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-slate-400 my-3" />

            {/* ------------------------------------------------ */}
            {/* TOTALS CALCULATION */}
            {/* ------------------------------------------------ */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-bold text-slate-900">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-bold">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-600">GST:</span>
                <span className="font-bold text-slate-900">{formatCurrency(invoice.gst)}</span>
              </div>

              {/* Double line / Bold line before Grand Total */}
              <div className="border-t-2 border-dashed border-slate-900 pt-2 pb-1" />

              <div className="flex justify-between text-sm sm:text-base font-black text-slate-950">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-blue-900">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="border-t-2 border-dashed border-slate-900 pb-2" />
            </div>

            {/* Amount in words */}
            <div className="text-[10px] text-slate-500 italic py-1 leading-snug">
              <span>Amount in words: </span>
              <span className="text-slate-800 font-semibold">{numberToWordsINR(invoice.grandTotal)}</span>
            </div>

            {/* ------------------------------------------------ */}
            {/* PAYMENT COMPLETED & STAMP SECTION */}
            {/* ------------------------------------------------ */}
            <div className="text-center pt-4 pb-2 space-y-2">
              <div className="inline-block border-2 border-emerald-600 bg-emerald-50 text-emerald-800 px-6 py-2 rounded-lg transform -rotate-1 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  PAYMENT COMPLETED
                </div>
                <div className="text-xl font-black tracking-widest text-emerald-700">
                  PAID
                </div>
                <div className="text-[10px] font-semibold text-emerald-700">
                  via {invoice.paymentMethod}
                </div>
              </div>

              <div className="pt-2">
                <p className="font-bold text-xs text-slate-900 font-sans">
                  Thank you for your purchase!
                </p>
                <p className="text-[10px] text-slate-500 font-sans">
                  Please visit again
                </p>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-slate-400 mt-3 pt-2 text-center text-[10px] text-slate-400">
              SMART BILL • Computer Generated Retail Bill
            </div>
          </div>

          {/* Quick share options below receipt (Hidden during print) */}
          <div className="max-w-[540px] mx-auto mt-4 print:hidden flex items-center justify-between text-xs text-slate-400 px-2">
            <span className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              Direct Customer Share
            </span>
            <button
              onClick={handleCopyReceiptSummary}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied text</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy text receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
