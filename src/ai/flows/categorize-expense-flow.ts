'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { AllowedCategories, type CategoryType } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { detectCategoryFromBusiness } from '@/lib/categorizer';

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

/**
 * Intelligent categorization of financial transaction narrations.
 * Combines high-speed deterministic merchant & brand matching with
 * OpenAI gpt-4o-mini reasoning for ambiguous transactions.
 */
export async function categorizeExpenses(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  const startTime = Date.now();
  const descriptions = input.descriptions || [];
  logger.info('AIFlow:Categorize', 'Starting expense categorization', { count: descriptions.length });

  // 1. Initial pass: Deterministic business & merchant detection
  const ruleResults = new Map<string, CategoryType>();
  const ambiguousDescriptions: string[] = [];

  for (const desc of descriptions) {
    const match = detectCategoryFromBusiness(desc);
    if (match.confidence === 'high') {
      ruleResults.set(desc, match.category);
    } else {
      ambiguousDescriptions.push(desc);
    }
  }

  // If all transactions were decisively identified by business rules, return immediately (<1ms)
  if (ambiguousDescriptions.length === 0) {
    logger.info('AIFlow:Categorize', 'All transactions classified via deterministic business rules', {
      count: descriptions.length,
      durationMs: Date.now() - startTime
    });
    return {
      results: descriptions.map(desc => ({
        description: desc,
        category: ruleResults.get(desc) || 'Miscellaneous'
      }))
    };
  }

  // 2. Secondary pass: Use OpenAI for remaining ambiguous narrations (if API key present)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      results: descriptions.map(desc => ({
        description: desc,
        category: ruleResults.get(desc) || detectCategoryFromBusiness(desc).category
      }))
    };
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 8000 });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant specialized in categorizing financial transactions based on merchant names, brand names, and banking narrations.
Return JSON strictly in the format:
{
  "results": [
    { "description": "exact description", "category": "category name" }
  ]
}

Allowed Categories: ${AllowedCategories.map(c => `'${c}'`).join(', ')}.
Assign the most appropriate category based on the business or merchant identity. If completely unidentifiable, assign 'Miscellaneous'.`
        },
        {
          role: 'user',
          content: `Categorize the following transactions:\n${ambiguousDescriptions.map(d => `- ${d}`).join('\n')}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.results)) {
        for (const item of parsed.results) {
          if (item?.description && item?.category && AllowedCategories.includes(item.category)) {
            ruleResults.set(item.description, item.category);
          }
        }
      }
    }
  } catch (error) {
    logger.warn('AIFlow:Categorize', 'OpenAI categorization skipped or timed out, applying merchant rule fallbacks', undefined, error);
  }

  // Assemble final results, ensuring no item is left unclassified
  const finalResults = descriptions.map(desc => {
    const existing = ruleResults.get(desc);
    if (existing && existing !== 'Miscellaneous') {
      return { description: desc, category: existing };
    }
    const detected = detectCategoryFromBusiness(desc);
    return { description: desc, category: detected.category };
  });

  logger.info('AIFlow:Categorize', 'Expense categorization completed', {
    total: descriptions.length,
    durationMs: Date.now() - startTime
  });

  return { results: finalResults };
}
