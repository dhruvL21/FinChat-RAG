'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const ExpenseCategorySchema = z.enum([
  'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping',
  'Entertainment', 'Healthcare', 'Education', 'Salary', 'Investment', 'Miscellaneous'
]);

const CategorizeExpenseInputSchema = z.object({
  descriptions: z.array(z.string()),
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Falling back to default categories.");
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

Allowed Categories: 'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Salary', 'Investment', 'Miscellaneous'.
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
        return parsed as CategorizeExpenseOutput;
      }
    }

    return {
      results: input.descriptions.map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  } catch (error) {
    console.error("OpenAI categorization error:", error);
    return {
      results: input.descriptions.map(desc => ({ description: desc, category: 'Miscellaneous' }))
    };
  }
}


