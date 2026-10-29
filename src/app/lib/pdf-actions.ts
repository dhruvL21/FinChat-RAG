'use server';

import { parsePdfBuffer, type ParsePdfResult } from '@/lib/pdf-parser';
import { logger } from '@/lib/logger';

/**
 * Server action to process, decrypt, and parse PDF bank statements.
 * Supports password authentication for encrypted bank PDFs.
 */
export async function processPdfStatementAction(
  formData: FormData
): Promise<ParsePdfResult> {
  const startTime = Date.now();
  try {
    const file = formData.get('file') as File | null;
    const password = (formData.get('password') as string) || '';

    if (!file) {
      return {
        success: false,
        error: 'No file was provided for PDF processing.'
      };
    }

    logger.info('PDFAction', 'Processing PDF statement', {
      filename: file.name,
      fileSize: file.size,
      hasPassword: Boolean(password)
    });

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const result = await parsePdfBuffer(uint8Array, password);

    logger.info('PDFAction', 'PDF statement processing completed', {
      filename: file.name,
      success: result.success,
      requiresPassword: Boolean(result.requiresPassword),
      durationMs: Date.now() - startTime
    });

    return result;
  } catch (error: any) {
    logger.error('PDFAction', 'Error in processPdfStatementAction', error);
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while processing the PDF statement.'
    };
  }
}
