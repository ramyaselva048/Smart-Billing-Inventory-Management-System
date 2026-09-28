export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? '-' : ''}${symbol}${formatted}`;
}

export function formatReceiptDate(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return isoOrDateStr;
  }
}

export function formatReceiptDateTime(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}-${month}-${year} ${time}`;
  } catch {
    return isoOrDateStr;
  }
}

export function formatDate(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '-';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoOrDateStr;
  }
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

// Convert amount to Indian currency words (e.g. "Rupees Eight Thousand Eight Hundred Forty-Seven Only")
export function numberToWordsINR(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return tens[t] + (o !== 0 ? ' ' + ones[o] : '');
  }

  function convertThreeDigits(num: number): string {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const rem = num % 100;
    let res = '';
    if (h > 0) {
      res += ones[h] + ' Hundred';
      if (rem > 0) res += ' and ';
    }
    if (rem > 0) {
      res += convertTwoDigits(rem);
    }
    return res;
  }

  if (amount === 0) return 'Rupees Zero Only';

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let crores = Math.floor(rupees / 10000000);
  let remAfterCrore = rupees % 10000000;
  let lakhs = Math.floor(remAfterCrore / 100000);
  let remAfterLakh = remAfterCrore % 100000;
  let thousands = Math.floor(remAfterLakh / 1000);
  let hundreds = remAfterLakh % 1000;

  const parts: string[] = [];

  if (crores > 0) {
    parts.push(convertThreeDigits(crores) + ' Crore');
  }
  if (lakhs > 0) {
    parts.push(convertThreeDigits(lakhs) + ' Lakh');
  }
  if (thousands > 0) {
    parts.push(convertThreeDigits(thousands) + ' Thousand');
  }
  if (hundreds > 0) {
    parts.push(convertThreeDigits(hundreds));
  }

  let result = 'Rupees ' + parts.join(' ');
  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise';
  }
  return result.trim() + ' Only';
}

export { exportToCSV } from './exportUtils';
