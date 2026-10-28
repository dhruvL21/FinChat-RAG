'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { AllowedCategories } from '@/lib/validation';
import { logger } from '@/lib/logger';

const ExpenseCategorySchema = z.enum(AllowedCategories);

const CategorizeExpenseInputSchema = z.object({
  descriptions: z.array(z.string().min(1)).min(1, 'At least one transaction description required'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  results: z.array(z.object({
    description: z.string(),
    category: ExpenseCategorySchema,
  })),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpenses(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  const startTime = Date.now();
  logger.info('AIFlow:Categorize', 'Starting expense categorization', { count: input.descriptions?.length || 0 });

  const validation = CategorizeExpenseInputSchema.safeParse(input);
  if (!validation.success) {
    logger.warn('AIFlow:Categorize', 'Validation failed for categorization input', { errors: validation.error.errors });
    return {
      results: (input.descriptions || []).map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('AIFlow:Categorize', 'OPENAI_API_KEY is missing. Using default category fallback.');
    return {
      results: input.descriptions.map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant specialized in categorizing financial transactions.
Return JSON strictly in the format:
{
  "results": [
    { "description": "transaction description", "category": "category name" }
  ]
}

Allowed Categories: ${AllowedCategories.map(c => `'${c}'`).join(', ')}.
If a transaction does not fit any specific category, assign it to 'Miscellaneous'.`
        },
        {
          role: 'user',
          content: `Categorize the following transactions:\n${input.descriptions.map(d => `- ${d}`).join('\n')}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.results)) {
        logger.info('AIFlow:Categorize', 'Expense categorization completed', { durationMs: Date.now() - startTime });
        return parsed as CategorizeExpenseOutput;
      }
    }

    logger.warn('AIFlow:Categorize', 'AI returned non-array result format, using fallback');
    return {
      results: input.descriptions.map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  } catch (error) {
    logger.error('AIFlow:Categorize', 'OpenAI categorization failed, applying fallback categories', error);
    return {
      results: input.descriptions.map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  }
}
