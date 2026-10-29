import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { detectCategoryFromBusiness } from '@/lib/categorizer';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { logger } from '@/lib/logger';

export interface ExtractedChunk {
  pageNumber: number;
  chunkOrder: number;
  text: string;
  transactionDate?: string;
  amount?: number;
  category?: string;
}

export interface ParsePdfResult {
  success: boolean;
  requiresPassword?: boolean;
  isIncorrectPassword?: boolean;
  error?: string;
  numPages?: number;
  totalTextLength?: number;
  chunks?: ExtractedChunk[];
  detectedTransactions?: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
    type: 'debit' | 'credit';
  }>;
}

/**
 * Normalizes common Indian bank statement date formats (DD/MM/YYYY, DD-MMM-YYYY, etc.)
 * into standard YYYY-MM-DD ISO format for seamless indexing and chart visualization.
 */
export function normalizeToISODate(rawDate: string): string {
  try {
    const trimmed = rawDate.trim();
    // 1. YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 2. DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmyMatch) {
      let [, d, m, y] = dmyMatch;
      if (y.length === 2) y = `20${y}`;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. DD-MMM-YYYY or DD MMM YYYY (e.g. 15-Apr-2026, 05 Oct 2026)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const namedMatch = trimmed.match(/^(\d{1,2})[-/\s]+([a-z]{3})[a-z]*[-/\s]+(\d{2,4})$/i);
    if (namedMatch) {
      let [, d, mStr, y] = namedMatch;
      const m = monthNames[mStr.toLowerCase()];
      if (m) {
        if (y.length === 2) y = `20${y}`;
        return `${y}-${m}-${d.padStart(2, '0')}`;
      }
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

/**
 * Categorizes bank transaction descriptions into standard Indian spending categories
 * using the intelligent merchant & business detection engine.
 */
function inferTransactionCategory(description: string, isCredit: boolean): string {
  if (isCredit) return 'Salary';
  const detected = detectCategoryFromBusiness(description, isCredit);
  return detected.category;
}

/**
 * Parses and decrypts a PDF buffer using in-process pdfjs-dist.
 * Accurately detects password requirements and authenticates encrypted statements.
 */
export async function parsePdfBuffer(
  buffer: Uint8Array,
  password?: string
): Promise<ParsePdfResult> {
  const startTime = Date.now();
  let needPassword = false;
  let wrongPassword = false;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      password: password || '',
      standardFontDataUrl: undefined,
      isEvalSupported: false,
      useSystemFonts: true
    });

    // Guard onPassword: reject with Error immediately so pdf.js terminates promptly without looping
    loadingTask.onPassword = (updatePassword: (password: string | Error) => void, reason: number) => {
      if (reason === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
        needPassword = true;
      } else if (reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
        wrongPassword = true;
      }
      updatePassword(new Error(reason === 2 ? 'Incorrect password' : 'Password required'));
    };

    let pdfDoc;
    try {
      pdfDoc = await loadingTask.promise;
    } catch (err: any) {
      const isPasswordIssue =
        needPassword ||
        wrongPassword ||
        err?.name === 'PasswordException' ||
        err?.code === 1 ||
        err?.code === 2 ||
        err?.message?.toLowerCase().includes('password');

      if (isPasswordIssue) {
        const isWrong =
          wrongPassword ||
          err?.code === 2 ||
          err?.message?.toLowerCase().includes('incorrect') ||
          Boolean(password && password.trim().length > 0);

        if (isWrong) {
          return {
            success: false,
            requiresPassword: true,
            isIncorrectPassword: true,
            error: 'Incorrect password for this bank statement PDF. Please check your credentials and try again.'
          };
        }

        return {
          success: false,
          requiresPassword: true,
          isIncorrectPassword: false,
          error: 'This bank statement is password-protected. Please enter your statement password to decrypt and index it.'
        };
      }
      throw err;
    }

    const numPages = pdfDoc.numPages;
    const chunks: ExtractedChunk[] = [];
    const detectedTransactions: Array<{
      date: string;
      description: string;
      amount: number;
      category?: string;
      type: 'debit' | 'credit';
    }> = [];

    let chunkCounter = 0;
    let totalTextLength = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as Array<{ str: string; hasEOL?: boolean }>;
      const lines: string[] = [];
      let currentLine = '';

      for (const item of items) {
        currentLine += item.str + ' ';
        if (item.hasEOL || currentLine.length > 120) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const fullPageText = lines.join('\n');
      totalTextLength += fullPageText.length;

      // Scan page text for Indian bank statement transaction patterns
      const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;

      lines.forEach((line) => {
        const dateMatch = line.match(dateRegex);
        if (dateMatch && line.length > 15) {
          const numbers = line.match(/(?:[0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\.[0-9]{2}/g);
          if (numbers && numbers.length > 0) {
            const rawAmt = numbers[numbers.length - 1].replace(/,/g, '');
            const parsedAmt = parseFloat(rawAmt);
            if (!isNaN(parsedAmt) && parsedAmt > 0) {
              const isCredit = /cr|credit|deposit|salary|refund/i.test(line) && !/debit|dr|withdraw/i.test(line);
              const cleanDesc = line.replace(dateRegex, '').replace(/[0-9,]+\.[0-9]{2}/g, '').replace(/[-|:]+/g, ' ').trim();
              const category = inferTransactionCategory(cleanDesc || line, isCredit);
              const isoDate = normalizeToISODate(dateMatch[1]);

              detectedTransactions.push({
                date: isoDate,
                description: cleanDesc.substring(0, 80) || 'Bank Statement Transaction',
                amount: parsedAmt,
                category,
                type: isCredit ? 'credit' : 'debit'
              });
            }
          }
        }
      });

      // Break page into clean chunks (~400-800 characters) for RAG context
      const maxChunkSize = 750;
      let pageOffset = 0;
      while (pageOffset < fullPageText.length) {
        const slice = fullPageText.slice(pageOffset, pageOffset + maxChunkSize);
        const breakIndex = slice.lastIndexOf('\n');
        const chunkContent = (breakIndex > 200 && pageOffset + maxChunkSize < fullPageText.length)
          ? slice.slice(0, breakIndex)
          : slice;

        if (chunkContent.trim()) {
          chunks.push({
            pageNumber: pageNum,
            chunkOrder: chunkCounter++,
            text: `[Page ${pageNum} of ${numPages}]\n${chunkContent.trim()}`,
            transactionDate: detectedTransactions[detectedTransactions.length - 1]?.date
          });
        }
        pageOffset += chunkContent.length;
      }
    }

    logger.info('PDFParser', 'Successfully decrypted and parsed PDF', {
      numPages,
      chunksCount: chunks.length,
      detectedTxCount: detectedTransactions.length,
      durationMs: Date.now() - startTime
    });

    return {
      success: true,
      numPages,
      totalTextLength,
      chunks,
      detectedTransactions
    };
  } catch (error: any) {
    logger.error('PDFParser', 'Error parsing PDF document', error);
    return {
      success: false,
      error: error?.message || 'Failed to read or decrypt the PDF document.'
    };
  }
}
