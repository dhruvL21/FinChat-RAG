'use server';
/**
 * @fileOverview A Genkit flow to categorize financial expenses based on transaction descriptions.
 *
 * - categorizeExpense - A function that handles the expense categorization process.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
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
  transactionDescription: z.string().describe('The description of a financial transaction.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  category: ExpenseCategorySchema,
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: { schema: CategorizeExpenseInputSchema },
  output: { schema: CategorizeExpenseOutputSchema },
  prompt: `You are an AI assistant specialized in categorizing financial transactions.
Given a transaction description, categorize it into one of the following categories:
'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Salary', 'Investment', 'Miscellaneous'.
If the transaction does not fit any of the specific categories, assign it to 'Miscellaneous'.

Transaction Description: "{{{transactionDescription}}}"
`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}
