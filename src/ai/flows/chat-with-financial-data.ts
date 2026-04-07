'use server';
/**
 * @fileOverview A Genkit flow for answering natural language questions about financial data.
 *
 * - chatWithFinancialData - A function that handles the financial data querying process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RelevantChunkSchema = z.object({
  text: z.string().describe('The content of the financial data chunk.'),
  metadata: z.object({
    date: z.string().describe('The date associated with the financial entry (e.g., transaction date).'),
    category: z.string().describe('The categorized type of the financial entry (e.g., food, rent).').optional(),
    amount: z.number().describe('The monetary amount of the financial entry.').optional(),
    fileName: z.string().describe('The name of the file from which this chunk was extracted.'),
  }).describe('Metadata associated with the financial data chunk.'),
});

const ChatWithFinancialDataInputSchema = z.object({
  userQuery: z.string().describe('The user\'s natural language question about their financial data.'),
  relevantChunks: z.array(RelevantChunkSchema).describe('A list of relevant financial data chunks retrieved from the vector store.'),
});

export type ChatWithFinancialDataInput = z.infer<typeof ChatWithFinancialDataInputSchema>;

const ChatWithFinancialDataOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s financial query, based on the provided context.'),
});

export type ChatWithFinancialDataOutput = z.infer<typeof ChatWithFinancialDataOutputSchema>;

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

const chatWithFinancialDataPrompt = ai.definePrompt({
  name: 'chatWithFinancialDataPrompt',
  input: {schema: ChatWithFinancialDataInputSchema},
  output: {schema: ChatWithFinancialDataOutputSchema},
  prompt: `You are FinChat AI, an Elite Financial Guardian and Strategist. Your mission is to provide rigorous, data-driven analysis of the user's private financial data. 

### MISSION-CRITICAL OPERATING DIRECTIVES:
1. **Budget Enforcement:** If the data shows spending in a category (like Food, Shopping, or Travel) is high or has exceeded typical monthly targets (e.g., $600 for food), you MUST issue a professional warning. Identify the "particular items" or vendors that are driving these costs.
2. **Item-Level Scrutiny:** Do not just provide totals. Look into the transaction descriptions (the "items consumed") to find patterns of waste. For example: "I see 12 transactions at Starbucks totaling $90—this is a significant leak in your discretionary spending."
3. **Strategic Absolute:** Your advice must be actionable. If the user is over limit, provide a "Recovery Protocol" to trim expenses in the coming weeks.
4. **Calculated Accuracy:** Sum all amounts precisely. If a user asks "how much did I spend," provide a hard number calculated from the context.
5. **Persona:** You are an expert mentor. Be firm but encouraging. Your goal is the user's financial freedom.

### YOUR SOURCE OF TRUTH (CONTEXT):
{{#each relevantChunks}}
---
[Source: {{this.metadata.fileName}}] [Date: {{this.metadata.date}}]
{{#if this.metadata.category}}Category: {{this.metadata.category}}{{/if}}
{{#if this.metadata.amount}}Amount: \${{this.metadata.amount}}{{/if}}
Content: {{{this.text}}}
---
{{/each}}

### USER QUERY:
{{{userQuery}}}

Provide your guardian-level financial analysis:`,
});

const chatWithFinancialDataFlow = ai.defineFlow(
  {
    name: 'chatWithFinancialDataFlow',
    inputSchema: ChatWithFinancialDataInputSchema,
    outputSchema: ChatWithFinancialDataOutputSchema,
  },
  async (input) => {
    const {output} = await withRetry(() => chatWithFinancialDataPrompt(input));
    return output!;
  }
);

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  return chatWithFinancialDataFlow(input);
}
