import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  Loader2
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../../types';
import { formatCurrency, formatDate, numberToWordsINR } from '../../utils/formatters';
import { generateInvoicePDF } from '../../utils/invoicePdf';

interface InvoiceModalProps {
  invoice: Invoice | null;
  settings: BusinessSettings;
  onClose: () => void;
  onCancelInvoice?: (invoiceId: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  settings,
  onClose,
  onCancelInvoice,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!invoice) return null;

  // Real Vector PDF Generation & Download via jsPDF (Instant, flawless, vector quality)
  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    setErrorMessage(null);

    try {
      generateInvoicePDF(invoice, settings);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setErrorMessage('Could not generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Direct, reliable printing for all browsers & sandboxes
  const handlePrint = () => {
    setIsPrinting(true);
    setErrorMessage(null);

    try {
      window.print();
    } catch (err) {
      console.error('Print failure:', err);
      setErrorMessage('Print dialog was blocked. You can save as PDF instead.');
    } finally {
      setTimeout(() => setIsPrinting(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
      {/* Container Card */}
      <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden during window.print via CSS) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="font-bold text-sm tracking-wide truncate">
              Invoice Preview • <span className="font-mono text-cyan-300">{invoice.invoiceNumber}</span>
            </span>
            {exportSuccess && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> PDF Downloaded!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Print A4 Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting || isExportingPDF}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Print A4 Invoice"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Printing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print A4</span>
                </>
              )}
            </button>

            {/* Save PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF || isPrinting}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Download PDF to computer"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Save PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-rose-50 text-rose-700 text-xs flex items-center justify-between px-4 border-b border-rose-200">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="p-1 text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Printable A4 Sheet Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 print:bg-white print:p-0 custom-scrollbar">
          <div
            ref={printRef}
            id="printable-invoice"
            className="bg-white p-6 sm:p-10 border border-slate-200 print:border-none rounded-xl max-w-[800px] mx-auto text-slate-800 shadow-sm print:shadow-none"
          >
            {/* Header: Company & Invoice Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    SB
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {settings.businessName}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 font-medium">{settings.tagline}</p>
                <p className="text-xs text-slate-600 mt-2 max-w-sm leading-relaxed">
                  {settings.address}, {settings.city}, {settings.state} - {settings.pincode}
                </p>
                <div className="text-xs text-slate-600 space-x-3 pt-1">
                  <span>Phone: <b className="font-mono">{settings.phone}</b></span>
                  <span>Email: <b className="font-mono">{settings.email}</b></span>
                </div>
                <div className="text-xs pt-0.5">
                  <span className="font-semibold text-slate-900">GSTIN: </span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {settings.gstin}
                  </span>
                </div>
              </div>

              {/* Invoice Meta Box */}
              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-widest rounded">
                  TAX INVOICE
                </span>
                <div className="pt-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Invoice Number</span>
                  <span className="font-mono font-black text-lg text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="text-xs text-slate-600">
                  <span>Invoice Date: </span>
                  <b className="text-slate-800">{formatDate(invoice.date)}</b>
                </div>
                <div className="text-xs text-slate-600">
                  <span>Payment Due: </span>
                  <b className="text-slate-800">{formatDate(invoice.dueDate)}</b>
                </div>
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      invoice.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : invoice.paymentStatus === 'Partial'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {invoice.status === 'cancelled' ? 'CANCELLED' : `STATUS: ${invoice.paymentStatus}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Billed To (Customer):
                </span>
                <p className="font-bold text-sm text-slate-900">{invoice.customerName}</p>
                <p className="text-slate-600 mt-0.5">{invoice.customerAddress}</p>
                <p className="text-slate-600 mt-0.5">Phone: <span className="font-mono">{invoice.customerPhone}</span></p>
                {invoice.customerEmail && (
                  <p className="text-slate-600">Email: <span className="font-mono">{invoice.customerEmail}</span></p>
                )}
                {invoice.customerGstin && (
                  <p className="mt-1 font-semibold text-slate-800">
                    GSTIN: <span className="font-mono text-blue-700">{invoice.customerGstin}</span>
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payment Details:
                </span>
                <p className="text-slate-700">
                  Payment Method: <b className="text-slate-900">{invoice.paymentMethod}</b>
                </p>
                <p className="text-slate-700">
                  Billed By: <b className="text-slate-900">{invoice.createdByName}</b>
                </p>
                {invoice.notes && (
                  <p className="text-slate-500 italic mt-1 max-w-xs sm:ml-auto">
                    Note: {invoice.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 w-8 text-center border-b border-slate-200">#</th>
                    <th className="p-2.5 border-b border-slate-200">Item Description</th>
                    <th className="p-2.5 border-b border-slate-200">SKU / Code</th>
                    <th className="p-2.5 text-center border-b border-slate-200">Qty</th>
                    <th className="p-2.5 text-right border-b border-slate-200">Rate</th>
                    <th className="p-2.5 text-right border-b border-slate-200">Disc</th>
                    <th className="p-2.5 text-center border-b border-slate-200">GST %</th>
                    <th className="p-2.5 text-right border-b border-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">{item.sku}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(item.unitPrice, settings.currencySymbol)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {item.gstRate}%
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalAmount, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-200 text-xs">
              {/* Left: Amount in Words & Bank Info */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Amount Chargeable (in words):
                  </span>
                  <p className="font-bold text-slate-900 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {numberToWordsINR(invoice.grandTotal)}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 text-[11px] space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">Bank Transfer Information:</span>
                  <p>Bank: <b className="font-mono">{settings.bankName}</b></p>
                  <p>A/C No: <b className="font-mono">{settings.accountNumber}</b></p>
                  <p>IFSC: <b className="font-mono">{settings.ifscCode}</b></p>
                  <p>UPI ID: <b className="font-mono text-blue-600">{settings.upiId}</b></p>
                </div>
              </div>

              {/* Right: Calculations Table */}
              <div className="space-y-1.5 text-right">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono font-semibold">{formatCurrency(invoice.subtotal, settings.currencySymbol)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between py-1 text-emerald-600 border-b border-slate-100">
                    <span>Discount Allowed:</span>
                    <span className="font-mono">-{formatCurrency(invoice.totalDiscount, settings.currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Taxable Value:</span>
                  <span className="font-mono font-semibold">{formatCurrency(invoice.taxableAmount, settings.currencySymbol)}</span>
                </div>

                {invoice.totalIgst > 0 ? (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>IGST (Integrated Tax):</span>
                    <span className="font-mono">{formatCurrency(invoice.totalIgst, settings.currencySymbol)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>CGST (Central Tax):</span>
                      <span className="font-mono">{formatCurrency(invoice.totalCgst, settings.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>SGST (State Tax):</span>
                      <span className="font-mono">{formatCurrency(invoice.totalSgst, settings.currencySymbol)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-base text-blue-700 font-mono">
                    {formatCurrency(invoice.grandTotal, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{formatCurrency(invoice.paidAmount, settings.currencySymbol)}</span>
                </div>

                <div className="flex justify-between py-1 text-rose-700 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(invoice.balanceAmount, settings.currencySymbol)}</span>
                </div>
              </div>
            </div>

            {/* Terms & Authorized Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-[10px] text-slate-500">
              <div>
                <span className="font-bold text-slate-700 block uppercase mb-1">Terms & Conditions:</span>
                <pre className="font-sans whitespace-pre-wrap leading-relaxed text-slate-500">
                  {settings.invoiceTerms}
                </pre>
              </div>

              <div className="text-right sm:mt-0 flex flex-col justify-end items-end">
                <p className="font-bold text-slate-800 text-xs">For {settings.businessName}</p>
                <div className="h-14 border-b border-dashed border-slate-300 w-44 mt-4" />
                <span className="text-[11px] font-semibold text-slate-600 mt-1">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
