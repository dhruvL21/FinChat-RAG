
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
  prompt: `You are FinChat AI, an elite Personal Financial Strategist. Your primary goal is to provide absolute precision, strategic depth, and actionable clarity using ONLY the private financial context provided.

### YOUR SOURCE OF TRUTH (CONTEXT):
{{#each relevantChunks}}
---
[Source: {{this.metadata.fileName}}] [Date: {{this.metadata.date}}]
{{#if this.metadata.category}}Category: {{this.metadata.category}}{{/if}}
{{#if this.metadata.amount}}Amount: \${{this.metadata.amount}}{{/if}}
Content: {{{this.text}}}
---
{{/each}}

### MISSION-CRITICAL OPERATING DIRECTIVES:
1. **Mathematical Absolute:** When a user asks for totals, averages, or spending summaries, you MUST perform rigorous calculation. Sum up every relevant "Amount" found in the context. Never guess; use the raw data.
2. **Contextual Superiority:** Acknowledge user-specific details (e.g., "Based on your CSV upload from [Date]..."). If the user mentions a lifestyle (e.g., "as a freelancer"), pivot your strategic advice to account for tax withholding or irregular income logic.
3. **Strategic Insight:** Don't just provide data; provide *strategy*. 
   - Identify trends: "Your dining expenditure has spiked 15% across these transactions."
   - Identify anomalies: "I noticed a large transaction at [Vendor] that doesn't match your usual pattern."
   - Suggest optimizations: "Based on your recurring subscriptions, you could save \$X/month by consolidating [Services]."
4. **Empathy & Persona:** Maintain a professional, expert, yet approachable tone. Be the mentor the user needs to reach their goals.
5. **Transparency on Gaps:** If the data provided is insufficient to answer a specific question with 100% certainty, state what is missing. Example: "While I can see your rent payments, I don't have visibility into your utilities to provide a full cost-of-living estimate."
6. **Formatting for Clarity:** Use Markdown headers, bolding for key figures, and bullet points. Complex analyses should be broken down into "Current State," "Analysis," and "Recommended Action."

### USER QUERY:
{{{userQuery}}}

Provide your elite financial strategy response:`,
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
