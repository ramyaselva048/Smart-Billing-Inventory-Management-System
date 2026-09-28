import jsPDF from 'jspdf';
import { Invoice, BusinessSettings } from '../types';
import { numberToWordsINR } from './formatters';

/**
 * High-fidelity Vector Invoice PDF Generator
 * Creates a professional, compliant Tax Invoice PDF instantly without html2canvas bugs
 */
export function generateInvoicePDF(invoice: Invoice, settings: BusinessSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  // Header Box / Border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Top Business Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, currentY, contentWidth, 22, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, margin + 5, currentY + 9);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(settings.tagline || 'Billing and Inventory Management', margin + 5, currentY + 15);

  // TAX INVOICE Badge
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.roundedRect(pageWidth - margin - 40, currentY + 5, 35, 12, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth - margin - 22.5, currentY + 12.5, { align: 'center' });

  currentY += 26;

  // Business Details & Invoice Metadata
  const leftX = margin + 2;
  const rightX = pageWidth / 2 + 5;

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Left side: Business Address & GSTIN
  doc.text(`${settings.address}, ${settings.city}, ${settings.state} - ${settings.pincode}`, leftX, currentY);
  currentY += 4.5;
  doc.text(`Phone: ${settings.phone}   |   Email: ${settings.email}`, leftX, currentY);
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text(`GSTIN: ${settings.gstin}`, leftX, currentY);

  // Right side: Invoice Number, Date, Status
  let metaY = currentY - 9;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, rightX, metaY);
  metaY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, rightX, metaY);
  metaY += 4.5;
  doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()} (${invoice.paymentMethod})`, rightX, metaY);

  currentY += 8;

  // Section Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Bill To / Customer Details Section
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 20, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO (CUSTOMER DETAILS)', margin + 4, currentY + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.customerName, margin + 4, currentY + 10.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${invoice.customerPhone || 'N/A'}    |    Address: ${invoice.customerAddress || 'Local Sale'}`, margin + 4, currentY + 15.5);

  if (invoice.customerGstin) {
    doc.text(`GSTIN: ${invoice.customerGstin}`, rightX, currentY + 15.5);
  }

  currentY += 24;

  // Table Column Definitions
  // Total width: 186mm
  const cols = [
    { label: '#', width: 8, align: 'center' as const },
    { label: 'ITEM DESCRIPTION', width: 62, align: 'left' as const },
    { label: 'HSN/SKU', width: 22, align: 'center' as const },
    { label: 'QTY', width: 14, align: 'center' as const },
    { label: 'RATE (₹)', width: 22, align: 'right' as const },
    { label: 'DISC %', width: 16, align: 'right' as const },
    { label: 'GST %', width: 16, align: 'right' as const },
    { label: 'TOTAL (₹)', width: 26, align: 'right' as const },
  ];

  // Table Header
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, currentY, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');

  let curX = margin;
  cols.forEach(col => {
    let textX = curX + 2;
    if (col.align === 'right') textX = curX + col.width - 2;
    if (col.align === 'center') textX = curX + col.width / 2;
    doc.text(col.label, textX, currentY + 4.8, { align: col.align });
    curX += col.width;
  });

  currentY += 7;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const rowHeight = 7.5;
  invoice.items.forEach((item, idx) => {
    // Check page overflow
    if (currentY + rowHeight > pageHeight - 65) {
      doc.addPage();
      currentY = margin;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    doc.setTextColor(30, 41, 59);

    let cellX = margin;

    // 1: Index
    doc.text(String(idx + 1), cellX + cols[0].width / 2, currentY + 5, { align: 'center' });
    cellX += cols[0].width;

    // 2: Product Name
    const truncatedName = doc.splitTextToSize(item.productName, cols[1].width - 4)[0] || '';
    doc.text(truncatedName, cellX + 2, currentY + 5);
    cellX += cols[1].width;

    // 3: SKU
    doc.text(item.sku || '-', cellX + cols[2].width / 2, currentY + 5, { align: 'center' });
    cellX += cols[2].width;

    // 4: Qty
    doc.text(String(item.quantity), cellX + cols[3].width / 2, currentY + 5, { align: 'center' });
    cellX += cols[3].width;

    // 5: Rate
    doc.text(item.unitPrice.toFixed(2), cellX + cols[4].width - 2, currentY + 5, { align: 'right' });
    cellX += cols[4].width;

    // 6: Disc
    doc.text(`${item.discountPercent || 0}%`, cellX + cols[5].width - 2, currentY + 5, { align: 'right' });
    cellX += cols[5].width;

    // 7: GST
    doc.text(`${item.gstPercent}%`, cellX + cols[6].width - 2, currentY + 5, { align: 'right' });
    cellX += cols[6].width;

    // 8: Line Total
    doc.setFont('helvetica', 'bold');
    doc.text(item.total.toFixed(2), cellX + cols[7].width - 2, currentY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    currentY += rowHeight;
  });

  currentY += 4;

  // Check page overflow for summary block
  if (currentY + 55 > pageHeight - margin) {
    doc.addPage();
    currentY = margin;
  }

  // Summary & Totals Block
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  // Words in Rupees (Left Side)
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT IN WORDS:', margin + 2, currentY + 4);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const wordsText = doc.splitTextToSize(numberToWordsINR(invoice.grandTotal), summaryBoxX - margin - 6);
  doc.text(wordsText, margin + 2, currentY + 9);

  // Bank Info (Left Side)
  if (settings.bankName) {
    const bankY = currentY + 18;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, bankY, summaryBoxX - margin - 4, 22, 1, 1, 'FD');

    doc.setTextColor(37, 99, 235);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK TRANSFER DETAILS', margin + 3, bankY + 4.5);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${settings.bankName}    |    A/C No: ${settings.bankAccountNo}`, margin + 3, bankY + 10);
    doc.text(`IFSC: ${settings.bankIfsc}    |    Branch: ${settings.bankBranch || 'Main'}`, margin + 3, bankY + 15);
  }

  // Right Side: Calculations Breakdown Box
  doc.setFillColor(248, 250, 252);
  doc.rect(summaryBoxX, currentY, summaryBoxWidth, 44, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(summaryBoxX, currentY, summaryBoxWidth, 44, 'S');

  let calcY = currentY + 5;
  const addSummaryRow = (label: string, valStr: string, bold: boolean = false) => {
    doc.setTextColor(bold ? 15 : 71, bold ? 23 : 85, bold ? 42 : 105);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 8.5 : 8);
    doc.text(label, summaryBoxX + 4, calcY);
    doc.text(valStr, summaryBoxX + summaryBoxWidth - 4, calcY, { align: 'right' });
    calcY += 5;
  };

  addSummaryRow('Subtotal:', `₹${invoice.subtotal.toFixed(2)}`);
  if (invoice.discountAmount > 0) {
    addSummaryRow('Discount:', `-₹${invoice.discountAmount.toFixed(2)}`);
  }
  if (invoice.cgst > 0) {
    addSummaryRow('CGST:', `₹${invoice.cgst.toFixed(2)}`);
    addSummaryRow('SGST:', `₹${invoice.sgst.toFixed(2)}`);
  } else if (invoice.igst > 0) {
    addSummaryRow('IGST:', `₹${invoice.igst.toFixed(2)}`);
  } else if (invoice.taxAmount > 0) {
    addSummaryRow('Tax / GST:', `₹${invoice.taxAmount.toFixed(2)}`);
  }

  // Grand Total Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(summaryBoxX, calcY - 1, summaryBoxX + summaryBoxWidth, calcY - 1);
  calcY += 2;

  doc.setFillColor(37, 99, 235);
  doc.rect(summaryBoxX, calcY - 2, summaryBoxWidth, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL:', summaryBoxX + 4, calcY + 4);
  doc.text(`₹${invoice.grandTotal.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 4, calcY + 4, { align: 'right' });

  calcY += 12;
  addSummaryRow('Amount Paid:', `₹${invoice.paidAmount.toFixed(2)}`, true);
  if (invoice.balanceDue > 0) {
    addSummaryRow('Balance Due:', `₹${invoice.balanceDue.toFixed(2)}`, true);
  }

  currentY += 50;

  // Footer / Signatory Block
  const footerY = Math.max(currentY, pageHeight - 32);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Terms: Payment due as per invoice terms. Goods once sold will not be taken back.', margin, footerY);
  doc.text('This is a computer-generated tax invoice and requires no physical signature.', margin, footerY + 4);

  // Authorized Signatory
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`For ${settings.businessName}`, pageWidth - margin - 50, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', pageWidth - margin - 50, footerY + 12);

  // Save PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
