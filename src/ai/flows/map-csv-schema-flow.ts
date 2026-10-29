'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const CSVSchemaMappingSchema = z.object({
  dateColumnIndex: z.number().describe('Zero-based column index for the transaction date field, or -1 if missing.'),
  descriptionColumnIndex: z.number().describe('Zero-based column index for transaction description, merchant, or item name, or -1 if missing.'),
  amountColumnIndex: z.number().describe('Zero-based column index for monetary transaction amount, or -1 if missing.'),
  categoryColumnIndex: z.number().describe('Zero-based column index for expense category if present in CSV, or -1 if missing.'),
  explanation: z.string().describe('Brief 1-sentence explanation of why these columns were mapped.')
});

export type CSVSchemaMapping = z.infer<typeof CSVSchemaMappingSchema>;

export interface MapCSVSchemaInput {
  sampleLines: string[];
  filename?: string;
}

export async function mapCSVSchema(input: MapCSVSchemaInput): Promise<CSVSchemaMapping> {
  const startTime = Date.now();
  logger.info('AIFlow:CSVMap', 'Starting CSV schema mapping', { filename: input.filename, lineCount: input.sampleLines?.length });

  const defaultFallback: CSVSchemaMapping = {
    dateColumnIndex: 0,
    descriptionColumnIndex: 1,
    amountColumnIndex: 2,
    categoryColumnIndex: -1,
    explanation: 'Default fallback index mapping (Col 0: Date, Col 1: Description, Col 2: Amount).'
  };

  if (!input.sampleLines || input.sampleLines.length === 0) {
    logger.warn('AIFlow:CSVMap', 'Empty CSV sample lines provided, using fallback mapping');
    return defaultFallback;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('AIFlow:CSVMap', 'OPENAI_API_KEY missing, using fallback column mapping');
    return defaultFallback;
  }

  // Set 10-second timeout to prevent upload hanging
  const openai = new OpenAI({ apiKey, timeout: 10000 });

  const promptContent = `Analyze the following CSV sample lines from the file "${input.filename || 'uploaded_statement.csv'}":

${input.sampleLines.map((line, idx) => `Line ${idx + 1}: ${line}`).join('\n')}

Identify which zero-based column indices correspond to:
1. dateColumnIndex: The transaction date (e.g. 2026-05-23, 15/01/2024).
2. descriptionColumnIndex: The merchant name, item description, details, or narrative (do NOT pick transaction IDs like TXN-1001).
3. amountColumnIndex: The numeric monetary value / spending amount (e.g. 450.50, 1200).
4. categoryColumnIndex: Expense category column if explicitly present, otherwise -1.

Return JSON in this format:
{
  "dateColumnIndex": 0,
  "descriptionColumnIndex": 1,
  "amountColumnIndex": 2,
  "categoryColumnIndex": -1,
  "explanation": "Column 0 is transaction date, Column 1 is vendor description, Column 2 is amount."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI data engineer specialized in parsing and mapping financial CSV files.'
        },
        {
          role: 'user',
          content: promptContent
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      logger.info('AIFlow:CSVMap', 'CSV schema mapped successfully', {
        dateCol: parsed.dateColumnIndex,
        descCol: parsed.descriptionColumnIndex,
        amtCol: parsed.amountColumnIndex,
        durationMs: Date.now() - startTime
      });

      return {
        dateColumnIndex: typeof parsed.dateColumnIndex === 'number' ? parsed.dateColumnIndex : 0,
        descriptionColumnIndex: typeof parsed.descriptionColumnIndex === 'number' ? parsed.descriptionColumnIndex : 1,
        amountColumnIndex: typeof parsed.amountColumnIndex === 'number' ? parsed.amountColumnIndex : 2,
        categoryColumnIndex: typeof parsed.categoryColumnIndex === 'number' ? parsed.categoryColumnIndex : -1,
        explanation: parsed.explanation || 'AI mapped features successfully.'
      };
    }

    return defaultFallback;
  } catch (error) {
    logger.error('AIFlow:CSVMap', 'OpenAI schema mapping error or timeout, applying default fallback', error);
    return defaultFallback;
  }
}
