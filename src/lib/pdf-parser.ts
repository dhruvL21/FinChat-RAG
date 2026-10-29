import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import path from 'path';
import { pathToFileURL } from 'url';
import { logger } from '@/lib/logger';

// Configure workerSrc explicitly to prevent fake worker resolution failure in Next.js/Turbopack
try {
  const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} catch (e) {
  // Fallback to bundled worker
}

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
    type: 'debit' | 'credit';
  }>;
}

/**
 * Parses and decrypts a PDF buffer using pdfjs-dist.
 * Correctly identifies password-protected PDFs and verifies supplied passwords.
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

    // Attach onPassword callback to detect password requirements
    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
      if (reason === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
        needPassword = true;
      } else if (reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
        wrongPassword = true;
      }
      // If we don't supply a valid new password immediately, cancel the prompt
      updatePassword('');
    };

    let pdfDoc;
    try {
      pdfDoc = await loadingTask.promise;
    } catch (err: any) {
      if (
        needPassword ||
        err?.name === 'PasswordException' ||
        err?.message?.toLowerCase().includes('password')
      ) {
        if (password && (wrongPassword || err?.code === 2)) {
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
      type: 'debit' | 'credit';
    }> = [];

    let chunkCounter = 0;
    let totalTextLength = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items preserving whitespace and line structure
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
      const dateRegex = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;

      lines.forEach((line) => {
        const dateMatch = line.match(dateRegex);
        if (dateMatch && line.length > 15) {
          const numbers = line.match(/(?:[0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\.[0-9]{2}/g);
          if (numbers && numbers.length > 0) {
            const rawAmt = numbers[numbers.length - 1].replace(/,/g, '');
            const parsedAmt = parseFloat(rawAmt);
            if (!isNaN(parsedAmt) && parsedAmt > 0) {
              const isDebit = /dr|debit|withdraw|transfer to|pos|upi/i.test(line);
              detectedTransactions.push({
                date: dateMatch[1],
                description: line.substring(0, 80).trim(),
                amount: parsedAmt,
                type: isDebit ? 'debit' : 'credit'
              });
            }
          }
        }
      });

      // Break page into clean chunks (~400-800 characters)
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
