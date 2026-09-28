import { Invoice, BusinessSettings } from '../types';
import {
  formatReceiptDate,
  formatReceiptDateTime,
  numberToWordsINR
} from './formatters';

/**
 * Direct Laptop & Desktop Invoice Print Utility
 * - Triggers laptop's native printer dialog
 * - Opens clean print window outside iframe sandbox so Chrome/Edge always shows printer dialog
 * - Shows all connected printers (Thermal POS, USB, Wi-Fi, Office laser)
 * - Renders complete retail tax invoice with shop details, item table, and PAID badge
 * - Never downloads a PDF file on Print
 */
export function executeBrowserPrint(
  fullHtml: string,
  title: string
): { success: boolean; popupBlocked?: boolean } {
  // Strategy 1: Dedicated clean print window
  // Runs outside sandboxed iframes so window.print() is never blocked by allow-modals restriction
  let printWin: Window | null = null;
  try {
    printWin = window.open(
      '',
      '_blank',
      'width=800,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  } catch (e) {
    printWin = null;
  }

  if (printWin && !printWin.closed) {
    try {
      printWin.document.open();
      // Auto-trigger print once content renders, then close window after print
      const scriptToInject = `
        <script>
          function startPrint() {
            window.focus();
            window.print();
          }
          if (document.readyState === 'complete') {
            setTimeout(startPrint, 150);
          } else {
            window.addEventListener('load', function() {
              setTimeout(startPrint, 150);
            });
          }
          window.addEventListener('afterprint', function() {
            setTimeout(function() {
              try { window.close(); } catch(e) {}
            }, 300);
          });
        </script>
      `;

      const readyHtml = fullHtml.includes('</body>')
        ? fullHtml.replace('</body>', `${scriptToInject}</body>`)
        : `${fullHtml}${scriptToInject}`;

      printWin.document.write(readyHtml);
      printWin.document.close();
      printWin.focus();

      // Fallback timer trigger in case window.load did not fire
      setTimeout(() => {
        try {
          if (printWin && !printWin.closed) {
            printWin.focus();
            printWin.print();
          }
        } catch (e) {}
      }, 400);

      return { success: true, popupBlocked: false };
    } catch (err) {
      console.warn('Writing to print window failed, trying fallback:', err);
    }
  }

  // Strategy 2: In-document isolated hidden iframe
  try {
    let iframe = document.getElementById('smartbill-native-print-frame') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'smartbill-native-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print failed, calling window.print():', iframeErr);
          window.print();
        }
      }, 150);

      return { success: true, popupBlocked: true };
    }
  } catch (err) {
    console.warn('Hidden iframe print failed:', err);
  }

  // Strategy 3: Direct window.print()
  try {
    window.print();
    return { success: true, popupBlocked: true };
  } catch (err) {
    console.error('All print methods failed:', err);
    return { success: false, popupBlocked: true };
  }
}

export function printInvoiceDirect(
  invoice: Invoice,
  settings: BusinessSettings
): { success: boolean; popupBlocked?: boolean } {
  const html = generateCompletePrintDocument(invoice, settings);
  const title = `Invoice_${invoice.invoiceNumber}`;
  return executeBrowserPrint(html, title);
}

function generateCompletePrintDocument(invoice: Invoice, settings: BusinessSettings): string {
  const storeName = settings.businessName || 'Retail Store';
  const storeAddress = settings.businessAddress || 'Store Address';
  const phone = settings.phone || 'N/A';
  const gstin = settings.gstNumber || 'N/A';
  const invoiceDate = formatReceiptDate(invoice.date);
  const invoiceTime = formatReceiptDateTime(invoice.createdAt || invoice.date);

  const itemsHtml = invoice.items
    .map((item, index) => {
      const extraNotes: string[] = [];
      if (item.gst && item.gst > 0) extraNotes.push(`GST: ${item.gst}%`);
      if (item.discount && item.discount > 0) extraNotes.push(`Disc: -₹${Number(item.discount).toFixed(2)}`);

      const extraText =
        extraNotes.length > 0
          ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">${extraNotes.join(' • ')}</div>`
          : '';

      return `
        <tr style="border-bottom: 1px dashed #94a3b8; vertical-align: top;">
          <td style="padding: 6px 4px; text-align: left;">
            <div style="font-weight: 700; color: #000000; font-size: 12px;">${index + 1}. ${escapeHtml(item.itemName)}</div>
            ${extraText}
          </td>
          <td style="padding: 6px 4px; text-align: center; font-weight: 700; color: #000000; font-size: 12px;">
            ${item.quantity}
          </td>
          <td style="padding: 6px 4px; text-align: right; color: #000000; font-size: 12px; white-space: nowrap;">
            ₹${Number(item.unitPrice).toFixed(2)}
          </td>
          <td style="padding: 6px 4px; text-align: right; font-weight: 700; color: #000000; font-size: 12px; white-space: nowrap;">
            ₹${Number(item.total).toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join('');

  const customerHtml =
    invoice.customerName || invoice.customerPhone || invoice.customerAddress
      ? `
      <div style="padding: 6px 0; border-top: 1px dotted #94a3b8; margin-top: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>Customer:</strong> ${escapeHtml(invoice.customerName || 'Walk-in Customer')}</span>
          ${invoice.customerPhone ? `<span><strong>Phone:</strong> ${escapeHtml(invoice.customerPhone)}</span>` : ''}
        </div>
        ${invoice.customerAddress ? `<div style="color: #475569; margin-top: 2px;">Address: ${escapeHtml(invoice.customerAddress)}</div>` : ''}
      </div>
    `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: auto;
          margin: 4mm 6mm;
        }
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
        }
        body {
          background: #ffffff;
          color: #000000;
          padding: 12px;
          display: flex;
          justify-content: center;
        }
        .receipt-card {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          padding: 16px 20px;
          page-break-inside: avoid;
        }
        .header {
          text-align: center;
          padding-bottom: 6px;
        }
        .tag {
          display: inline-block;
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .app-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #000000;
          margin: 2px 0;
        }
        .shop-name {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 3px 0 2px 0;
        }
        .shop-info {
          font-size: 11px;
          color: #334155;
          margin: 2px 0;
        }
        .dashed-line {
          border-top: 2px dashed #64748b;
          margin: 8px 0;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          font-size: 11.5px;
          padding: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0;
          font-size: 12px;
        }
        th {
          border-bottom: 2px dashed #64748b;
          padding: 6px 4px;
          font-size: 11px;
          text-transform: uppercase;
          color: #000000;
          font-weight: 800;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 2.5px 0;
          font-size: 12px;
          color: #1e293b;
        }
        .grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
          font-weight: 900;
          color: #000000;
          padding: 6px 0;
          border-top: 2px dashed #000000;
          border-bottom: 2px dashed #000000;
          margin: 6px 0;
        }
        .paid-stamp-box {
          text-align: center;
          padding: 10px 0 4px 0;
        }
        .stamp-badge {
          display: inline-block;
          border: 2px solid #059669;
          background: #ecfdf5;
          color: #065f46;
          padding: 4px 22px;
          border-radius: 6px;
          font-weight: 900;
          transform: rotate(-1deg);
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <!-- Shop Header -->
        <div class="header">
          <div class="tag">RETAIL TAX INVOICE</div>
          <h1 class="app-title">SMART BILL</h1>
          <div class="shop-name">${escapeHtml(storeName)}</div>
          <div class="shop-info">${escapeHtml(storeAddress)}</div>
          <div class="shop-info">Phone: <b>${escapeHtml(phone)}</b> | GSTIN: <b>${escapeHtml(gstin)}</b></div>
        </div>

        <div class="dashed-line"></div>

        <!-- Metadata -->
        <div class="meta-grid">
          <div>Invoice No: <strong style="color: #1e3a8a;">${escapeHtml(invoice.invoiceNumber)}</strong></div>
          <div style="text-align: right;">Date: <strong>${escapeHtml(invoiceDate)}</strong></div>
          <div>Payment: <strong>${escapeHtml(invoice.paymentMethod)}</strong></div>
          <div style="text-align: right;">Status: <strong style="color: #059669;">PAID</strong></div>
          ${invoice.paymentRef ? `<div style="grid-column: span 2; font-size: 10px; color: #475569;">Ref: ${escapeHtml(invoice.paymentRef)}</div>` : ''}
          <div style="grid-column: span 2; font-size: 10px; color: #64748b;">Time: ${escapeHtml(invoiceTime)}</div>
        </div>

        ${customerHtml}

        <div class="dashed-line"></div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center; width: 45px;">Qty</th>
              <th style="text-align: right; width: 75px;">Price</th>
              <th style="text-align: right; width: 85px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-line"></div>

        <!-- Totals -->
        <div style="font-size: 12px;">
          <div class="totals-row">
            <span>Subtotal:</span>
            <strong>₹${invoice.subtotal.toFixed(2)}</strong>
          </div>
          ${
            invoice.discount > 0
              ? `
            <div class="totals-row" style="color: #059669;">
              <span>Discount:</span>
              <strong>-₹${invoice.discount.toFixed(2)}</strong>
            </div>
          `
              : ''
          }
          <div class="totals-row">
            <span>GST:</span>
            <strong>₹${invoice.gst.toFixed(2)}</strong>
          </div>

          <div class="grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹${invoice.grandTotal.toFixed(2)}</span>
          </div>

          <div style="font-size: 10px; color: #475569; font-style: italic; padding: 2px 0;">
            Amount in words: <strong style="color: #000000;">${numberToWordsINR(invoice.grandTotal)}</strong>
          </div>
        </div>

        <!-- Paid Stamp -->
        <div class="paid-stamp-box">
          <div class="stamp-badge">
            <div style="font-size: 9px; letter-spacing: 1px; color: #059669;">PAYMENT COMPLETED</div>
            <div style="font-size: 17px; letter-spacing: 2px;">PAID</div>
            <div style="font-size: 9px; font-weight: 600;">via ${escapeHtml(invoice.paymentMethod)}</div>
          </div>
          <div style="margin-top: 6px; font-weight: 700; font-family: -apple-system, sans-serif; font-size: 12px; color: #000000;">
            Thank you for your purchase!
          </div>
          <div style="font-size: 10.5px; color: #475569; font-family: -apple-system, sans-serif;">
            Please visit again
          </div>
        </div>

        <div class="dashed-line"></div>
        <div style="text-align: center; font-size: 9.5px; color: #64748b;">
          SMART BILL • Computer Generated Retail Bill
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
