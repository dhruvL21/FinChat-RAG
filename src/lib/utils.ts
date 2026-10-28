import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

/**
 * Parses a single CSV line properly handling quoted strings containing commas and escaped quotes
 */
export function splitCSVLine(text: string): string[] {
  if (!text) return [];
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      if (inQuotes && text[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result.map(s => s.replace(/^["']|["']$/g, '').trim());
}

export function parseCSVLine(line: string, headers?: string[]): ParsedTransaction {
  const parts = splitCSVLine(line);

  let date = '';
  let description = '';
  let amount = 0;
  let category = '';

  if (headers && headers.length > 0) {
    headers.forEach((h, idx) => {
      const col = h.toLowerCase().replace(/[^a-z]/g, '');
      const val = parts[idx] || '';
      if (!val) return;

      if (['date', 'time', 'txndate', 'transactiondate', 'dt'].includes(col)) {
        date = val;
      } else if (['description', 'desc', 'details', 'merchant', 'item', 'particulars', 'narrative', 'payee', 'title', 'name'].includes(col)) {
        description = val;
      } else if (['amount', 'amt', 'price', 'cost', 'total', 'sum', 'value', 'debit', 'credit', 'inr', 'rupees'].includes(col)) {
        const parsedAmt = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsedAmt)) amount = Math.abs(parsedAmt);
      } else if (['category', 'cat', 'type'].includes(col)) {
        category = val;
      }
    });
  }

  parts.forEach(part => {
    if (!part) return;

    if (!date && (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(part) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(part))) {
      date = part;
      return;
    }

    const cleanNum = part.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanNum);
    if (amount === 0 && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleanNum)) {
      if (!part.toUpperCase().startsWith('TXN') && !part.toUpperCase().startsWith('ID') && part.length < 12) {
        amount = Math.abs(num);
        return;
      }
    }

    if (!description && !part.toUpperCase().startsWith('TXN-') && !part.toUpperCase().startsWith('ID-') && isNaN(Number(part)) && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(part)) {
      description = part;
    }
  });

  return {
    date: date || new Date().toISOString().split('T')[0],
    description: description || parts.find(p => p && !p.toUpperCase().startsWith('TXN-') && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(p)) || 'Financial Record',
    amount: amount,
    category: category || 'Miscellaneous'
  };
}

