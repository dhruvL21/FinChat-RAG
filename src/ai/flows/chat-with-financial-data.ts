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

const chatWithFinancialDataPrompt = ai.definePrompt({
  name: 'chatWithFinancialDataPrompt',
  input: {schema: ChatWithFinancialDataInputSchema},
  output: {schema: ChatWithFinancialDataOutputSchema},
  prompt: `You are FinChat AI, a highly sophisticated and empathetic personal financial strategist. Your mission is to empower users with deep insights and actionable advice derived from their private financial data.

You have access to a curated set of transaction logs and document extracts provided below. Use this data as your primary source of truth.

### Contextual Financial Data:
{{#each relevantChunks}}
---
Document Source: {{this.metadata.fileName}}
Date of Entry: {{this.metadata.date}}
{{#if this.metadata.category}}Category: {{this.metadata.category}}{{/if}}
{{#if this.metadata.amount}}Amount: \${{this.metadata.amount}}{{/if}}
Detailed Content: {{{this.text}}}
---
{{/each}}

### Interaction Guidelines:
1. **Be Data-Driven:** Always look for patterns, trends, and specific totals in the provided data. If a user asks about spending, sum the relevant items accurately.
2. **Empathy & Persona:** If a user provides personal context (e.g., "I am a student" or "I am from a middle-class background"), acknowledge this context and tailor your tone and advice to suit that demographic's typical challenges and financial goals.
3. **Comprehensive Insights:** Don't just list transactions. Group them by category, compare spending over different dates if visible, and highlight significant expenditures or potential savings.
4. **Calculation Accuracy:** Perform precise math. When providing totals or averages, ensure they match the data provided in the context.
5. **Handling Information Gaps:** If the data doesn't contain a specific answer, provide the best possible strategic guidance based on what *is* available. If you truly cannot find anything relevant, suggest what kind of document the user might need to upload to get that answer. Avoid being defensive; be a helpful consultant.
6. **Formatting:** Use clear, conversational language. Use bullet points, bold text, and structured paragraphs to make your financial analysis easy to digest.
7. **Privacy First:** Remind the user that your analysis is based solely on their private, uploaded documents.

### Current User Query:
{{{userQuery}}}

Please provide your strategic financial response below:`,
});

const chatWithFinancialDataFlow = ai.defineFlow(
  {
    name: 'chatWithFinancialDataFlow',
    inputSchema: ChatWithFinancialDataInputSchema,
    outputSchema: ChatWithFinancialDataOutputSchema,
  },
  async (input) => {
    const {output} = await chatWithFinancialDataPrompt(input);
    return output!;
  }
);

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  return chatWithFinancialDataFlow(input);
}
