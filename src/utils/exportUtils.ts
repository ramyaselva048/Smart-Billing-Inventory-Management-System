import jsPDF from 'jspdf';
import { executeBrowserPrint } from './invoicePrint';

export interface ReportSummaryCard {
  label: string;
  value: string;
}

/**
 * Robust CSV Export utility
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number | undefined | null) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = '\uFEFF' + [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = (filename || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `${safeFilename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Universal Native Print Report utility using window.print()
 * - Directly triggers laptop native printer dialog
 * - Shows all connected printers, hides 100% of website UI
 * - Renders crisp tables and summary metric cards with proper print CSS
 * - Never downloads a PDF file on Print
 */
export function printReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaryCards?: ReportSummaryCard[]
): void {
  const now = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const cardsHtml = summaryCards && summaryCards.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(${Math.min(summaryCards.length, 5)}, 1fr); gap: 10px; margin-bottom: 16px;">
      ${summaryCards.map(c => `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">
          <div style="font-size: 10px; color: #475569; text-transform: uppercase; font-weight: 700;">${escapeHtml(c.label)}</div>
          <div style="font-size: 15px; color: #0f172a; font-weight: 800; margin-top: 2px;">${escapeHtml(String(c.value))}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableRowsHtml = rows.map((r, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; page-break-inside: avoid; break-inside: avoid;">
      ${r.map(cell => `
        <td style="padding: 7px 9px; border: 1px solid #cbd5e1; font-size: 11px; color: #1e293b;">
          ${escapeHtml(String(cell))}
        </td>
      `).join('')}
    </tr>
  `).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - SMART BILL</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 12px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body { padding: 4mm 6mm; }
    }
  </style>
</head>
<body>
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 4px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="background: #2563eb; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px;">SMART BILL</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 600;">Enterprise Billing & POS</span>
        </div>
        <h1 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">${escapeHtml(title)}</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${escapeHtml(subtitle)}</div>
      </div>
      <div style="font-size: 11px; color: #475569; text-align: right;">
        <div><strong>Generated:</strong> ${escapeHtml(now)}</div>
        <div><strong>Total Records:</strong> ${rows.length}</div>
      </div>
    </div>

    ${cardsHtml}

    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
      <thead>
        <tr style="page-break-inside: avoid; break-inside: avoid;">
          ${headers.map(h => `
            <th style="background-color: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 8px 9px; border: 1px solid #cbd5e1;">
              ${escapeHtml(h)}
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 20px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
      <span>SMART BILL • Billing & Invoice Management System</span>
      <span>Computer Generated Business Report</span>
    </div>
  </div>
</body>
</html>`;

  executeBrowserPrint(fullHtml, title);
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

/**
 * High-fidelity Vector PDF Report Generator using jsPDF
 * Works reliably without HTML canvas conversion or CSS oklch bugs
 */
export function downloadPDFReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaryCards?: ReportSummaryCard[],
  filename?: string
): void {
  // Landscape A4: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  let currentY = margin;

  // Header Bar
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(margin, currentY, 26, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART BILL', margin + 3, currentY + 4.8);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Billing & Invoice Management System', margin + 30, currentY + 4.8);

  const dateStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 4.8, { align: 'right' });

  currentY += 12;

  // Report Title
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, currentY);

  currentY += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, currentY);

  currentY += 5;
  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Summary Cards
  if (summaryCards && summaryCards.length > 0) {
    const cardCount = Math.min(summaryCards.length, 5);
    const cardGap = 4;
    const cardWidth = (printableWidth - (cardCount - 1) * cardGap) / cardCount;
    const cardHeight = 14;

    summaryCards.slice(0, cardCount).forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label.toUpperCase(), cardX + 3, currentY + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(String(card.value), cardX + 3, currentY + 10.5);
    });

    currentY += cardHeight + 6;
  }

  // Calculate Column Widths
  const colCount = headers.length;
  const colWidth = printableWidth / colCount;

  // Draw Table Headers
  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, printableWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 7, margin + printableWidth, y + 7);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    headers.forEach((h, i) => {
      const x = margin + i * colWidth + 2;
      const truncatedHeader = doc.splitTextToSize(h.toUpperCase(), colWidth - 4)[0] || '';
      doc.text(truncatedHeader, x, y + 4.8);
    });
  };

  drawTableHeader(currentY);
  currentY += 8;

  // Draw Data Rows
  const rowHeight = 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);

  rows.forEach((row, rowIndex) => {
    // Check if new page is needed
    if (currentY + rowHeight > pageHeight - 15) {
      // Add Page
      doc.addPage();
      currentY = margin;
      drawTableHeader(currentY);
      currentY += 8;
    }

    // Striping
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, printableWidth, rowHeight, 'F');
    }

    // Row Bottom Border
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, margin + printableWidth, currentY + rowHeight);

    doc.setTextColor(30, 41, 59);

    row.forEach((cellVal, colIndex) => {
      const cellText = String(cellVal ?? '');
      const x = margin + colIndex * colWidth + 2;
      const fitText = doc.splitTextToSize(cellText, colWidth - 4)[0] || '';
      doc.text(fitText, x, currentY + 4.5);
    });

    currentY += rowHeight;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'SMART BILL • Billing & Invoice Management System — Confidential Business Report',
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  const cleanFilename = (filename || title || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanFilename}.pdf`);
}
