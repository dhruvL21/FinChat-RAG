'use server';
/**
 * @fileOverview A Genkit flow to categorize financial expenses based on transaction descriptions in batches.
 *
 * - categorizeExpenses - A function that handles the batch expense categorization process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExpenseCategorySchema = z.union([
  z.literal('Food'),
  z.literal('Rent'),
  z.literal('EMI'),
  z.literal('Travel'),
  z.literal('Utilities'),
  z.literal('Shopping'),
  z.literal('Entertainment'),
  z.literal('Healthcare'),
  z.literal('Education'),
  z.literal('Salary'),
  z.literal('Investment'),
  z.literal('Miscellaneous')
]).describe('A predefined category for a financial transaction.');

const CategorizeExpenseInputSchema = z.object({
  descriptions: z.array(z.string()).describe('A list of financial transaction descriptions to categorize.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  results: z.array(z.object({
    description: z.string(),
    category: ExpenseCategorySchema,
  })).describe('The categorization results for each input description.'),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

// Internal retry helper to handle 429/RESOURCE_EXHAUSTED errors
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = String(error);
    if ((errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: { schema: CategorizeExpenseInputSchema },
  output: { schema: CategorizeExpenseOutputSchema },
  prompt: `You are an AI assistant specialized in categorizing financial transactions.
Given a list of transaction descriptions, categorize each one into one of the following categories:
'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Salary', 'Investment', 'Miscellaneous'.
If a transaction does not fit any of the specific categories, assign it to 'Miscellaneous'.

Transactions:
{{#each descriptions}}
- {{{this}}}
{{/each}}
`,
});

const categorizeExpensesFlow = ai.defineFlow(
  {
    name: 'categorizeExpensesFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async (input) => {
    const { output } = await withRetry(() => prompt(input));
    return output!;
  }
);

export async function categorizeExpenses(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpensesFlow(input);
}
