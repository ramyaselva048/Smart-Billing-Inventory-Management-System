import jsPDF from 'jspdf';
import { Invoice, BusinessSettings } from '../types';
import { numberToWordsINR, formatReceiptDate } from './formatters';

/**
 * Professional Shop Bill & Invoice PDF Generator
 * - Creates a clean, vector-based PDF receipt/invoice
 * - Contains complete bill data from database & business settings
 * - Exact filename format: Invoice-INV-2026-00001.pdf
 * - Print-ready and direct shareable via WhatsApp, Email, etc.
 */
export function generateInvoicePDF(invoice: Invoice, settings: BusinessSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const centerX = pageWidth / 2;

  let currentY = margin;

  // Outer subtle boundary for receipt/shop invoice frame
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin - 4, margin - 4, contentWidth + 8, pageHeight - margin * 2 + 8, 2, 2, 'S');

  // ==========================================
  // 1. SHOP HEADER (Centered)
  // ==========================================
  // App Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('SMART BILL', centerX, currentY + 4, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Billing & Invoice System', centerX, currentY + 9, { align: 'center' });

  // Business Name
  currentY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.businessName || 'Retail Store', centerX, currentY, { align: 'center' });

  // Address
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const addressLines = doc.splitTextToSize(settings.businessAddress || 'Store Address', contentWidth - 20);
  doc.text(addressLines, centerX, currentY, { align: 'center' });
  currentY += addressLines.length * 4.2;

  // Phone & GSTIN
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const phoneText = `Phone: ${settings.phone || 'N/A'}`;
  const gstinText = `GSTIN: ${settings.gstNumber || 'N/A'}`;
  doc.text(`${phoneText}    |    ${gstinText}`, centerX, currentY, { align: 'center' });

  // Top Divider (Dashed)
  currentY += 5;
  drawDashedLine(doc, margin, currentY, pageWidth - margin);

  // ==========================================
  // 2. INVOICE METADATA
  // ==========================================
  currentY += 5;
  doc.setFontSize(9);

  const invoiceDateStr = formatReceiptDate(invoice.date) || new Date(invoice.createdAt || invoice.date).toLocaleDateString('en-IN');

  // Left side
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice No:', margin + 2, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Blue 800
  doc.text(invoice.invoiceNumber, margin + 26, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Date:', margin + 2, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(invoiceDateStr, margin + 26, currentY + 5.5);

  // Right side
  const rightColX = centerX + 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Payment:', rightColX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.paymentMethod, rightColX + 22, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Status:', rightColX, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Green 600
  doc.text('PAID', rightColX + 22, currentY + 5.5);

  currentY += 10;

  // Customer info if typed
  if (invoice.customerName || invoice.customerPhone) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Customer:', margin + 2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const custText = `${invoice.customerName || 'Walk-in Customer'}${invoice.customerPhone ? `  (Phone: ${invoice.customerPhone})` : ''}`;
    doc.text(custText, margin + 26, currentY);
    currentY += 5;
  }

  // Divider after metadata (Dashed)
  drawDashedLine(doc, margin, currentY, pageWidth - margin);

  // ==========================================
  // 3. ITEMS TABLE
  // ==========================================
  currentY += 5;

  // Columns layout
  const colItemX = margin + 2;
  const colQtyX = margin + 98;
  const colPriceX = margin + 130;
  const colAmountX = pageWidth - margin - 2;

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Item', colItemX, currentY);
  doc.text('Qty', colQtyX, currentY, { align: 'center' });
  doc.text('Price', colPriceX, currentY, { align: 'right' });
  doc.text('Amount', colAmountX, currentY, { align: 'right' });

  // Divider under table header
  currentY += 3;
  drawDashedLine(doc, margin, currentY, pageWidth - margin);
  currentY += 5;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const rowHeight = 7;
  invoice.items.forEach((item, index) => {
    // Pagination safety
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = margin + 10;
    }

    // Item name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const itemName = `${index + 1}. ${item.itemName}`;
    const truncatedName = doc.splitTextToSize(itemName, 88)[0] || '';
    doc.text(truncatedName, colItemX, currentY);

    // If item has discount or GST, show subtle note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    // Qty
    doc.text(String(item.quantity), colQtyX, currentY, { align: 'center' });

    // Price
    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, colPriceX, currentY, { align: 'right' });

    // Total Amount
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.total.toFixed(2)}`, colAmountX, currentY, { align: 'right' });

    // Extra details subrow if discount or GST is present
    if (item.discount > 0 || (item.gst && item.gst > 0)) {
      currentY += 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const subDetails: string[] = [];
      if (item.gst) subDetails.push(`GST: ${item.gst}%`);
      if (item.discount > 0) subDetails.push(`Disc: -Rs. ${item.discount.toFixed(2)}`);
      doc.text(`(${subDetails.join(' | ')})`, colItemX + 4, currentY);
    }

    currentY += rowHeight;
  });

  // Divider under items
  drawDashedLine(doc, margin, currentY, pageWidth - margin);
  currentY += 5;

  // ==========================================
  // 4. TOTALS SECTION
  // ==========================================
  const totalsLabelX = pageWidth - margin - 60;
  const totalsValX = pageWidth - margin - 2;

  doc.setFontSize(9);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsLabelX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, totalsValX, currentY, { align: 'right' });
  currentY += 5;

  // Discount (if any)
  if (invoice.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129); // Green
    doc.text('Discount:', totalsLabelX, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`-Rs. ${invoice.discount.toFixed(2)}`, totalsValX, currentY, { align: 'right' });
    currentY += 5;
  }

  // GST
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('GST:', totalsLabelX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${invoice.gst.toFixed(2)}`, totalsValX, currentY, { align: 'right' });
  currentY += 5;

  // Divider before GRAND TOTAL
  drawDashedLine(doc, margin, currentY, pageWidth - margin);
  currentY += 5;

  // GRAND TOTAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL:', totalsLabelX, currentY);
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175); // Bold Blue
  doc.text(`Rs. ${invoice.grandTotal.toFixed(2)}`, totalsValX, currentY, { align: 'right' });
  currentY += 4;

  // Divider after GRAND TOTAL
  drawDashedLine(doc, margin, currentY, pageWidth - margin);
  currentY += 6;

  // Amount in Words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount in words:', margin + 2, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const wordsText = doc.splitTextToSize(numberToWordsINR(invoice.grandTotal), contentWidth - 4);
  doc.text(wordsText, margin + 2, currentY);
  currentY += wordsText.length * 4.5;

  // ==========================================
  // 5. PAYMENT COMPLETED & STAMP SECTION
  // ==========================================
  currentY = Math.max(currentY + 4, currentY);

  // Paid Stamp Box (Centered)
  const stampWidth = 60;
  const stampHeight = 15;
  const stampX = centerX - stampWidth / 2;

  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(0.6);
  doc.roundedRect(stampX, currentY, stampWidth, stampHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('PAYMENT COMPLETED', centerX, currentY + 5.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(4, 120, 87);
  doc.text('PAID', centerX, currentY + 11.5, { align: 'center' });

  currentY += stampHeight + 7;

  // Thank you note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Thank you for your purchase!', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an authentic computer-generated retail tax bill / receipt.', centerX, currentY, { align: 'center' });

  // Bottom Divider
  currentY += 4;
  drawDashedLine(doc, margin, currentY, pageWidth - margin);

  // Mandatory Exact Filename: Invoice-INV-2026-00001.pdf
  const filename = `Invoice-${invoice.invoiceNumber}.pdf`;
  doc.save(filename);
}

/**
 * Helper to draw crisp dashed separator lines in jsPDF
 */
function drawDashedLine(doc: jsPDF, x1: number, y: number, x2: number): void {
  doc.setDrawColor(148, 163, 184); // Slate 400
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0); // reset dash pattern
}
