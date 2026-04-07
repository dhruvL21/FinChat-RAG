'use server';
/**
 * @fileOverview A Genkit flow for answering natural language questions about financial data.
 *
 * - chatWithFinancialData - A function that handles the financial data querying process.
 * - ChatWithFinancialDataInput - The input type for the chatWithFinancialData function.
 * - ChatWithFinancialDataOutput - The return type for the chatWithFinancialData function.
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
}).describe('A single relevant chunk of financial data.');

const ChatWithFinancialDataInputSchema = z.object({
  userQuery: z.string().describe('The user\'s natural language question about their financial data.'),
  relevantChunks: z.array(RelevantChunkSchema).describe('A list of relevant financial data chunks retrieved from the vector store.'),
}).describe('Input for asking questions about financial data.');

export type ChatWithFinancialDataInput = z.infer<typeof ChatWithFinancialDataInputSchema>;

const SourceSchema = z.object({
  text: z.string().describe('The content of the original source chunk.'),
  fileName: z.string().describe('The name of the file from which this source was extracted.'),
  date: z.string().describe('The date associated with this source.').optional(), // Optional as LLM might not always pull it out consistently
}).describe('A source document chunk that was used to formulate the answer.');

const ChatWithFinancialDataOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s financial query, based on the provided context.'),
  sources: z.array(SourceSchema).describe('A list of source document chunks that were used to generate the answer.'),
}).describe('Output containing the AI\'s answer and supporting sources.');

export type ChatWithFinancialDataOutput = z.infer<typeof ChatWithFinancialDataOutputSchema>;

const chatWithFinancialDataPrompt = ai.definePrompt({
  name: 'chatWithFinancialDataPrompt',
  input: {schema: ChatWithFinancialDataInputSchema},
  output: {schema: ChatWithFinancialDataOutputSchema},
  prompt: `You are a helpful and accurate personal financial assistant. Your goal is to answer the user's questions about their financial data based *only* on the provided context. If you cannot find the answer in the provided context, clearly state that you do not have enough information. Do not invent information.

Here is the financial data relevant to the user's query:

{{#each relevantChunks}}
---
Source Document: {{this.metadata.fileName}} (Date: {{this.metadata.date}})
{{#if this.metadata.category}}Category: {{this.metadata.category}}{{/if}}
{{#if this.metadata.amount}}Amount: \${{this.metadata.amount}}{{/if}}
Content: {{{this.text}}}
---
{{/each}}

User's Question: {{{userQuery}}}

Please provide a concise answer to the user's question, strictly using the provided financial data. For each piece of information you provide, indicate which 'Source Document' (and optionally its date, category, and amount if relevant) it came from.

Finally, provide a 'Sources:' section at the end of your answer, listing the \`fileName\` and \`date\` for each source that you explicitly used to formulate your answer. The source data you output must be an array of objects matching the SourceSchema provided to you.`,
});

const chatWithFinancialDataFlow = ai.defineFlow(
  {
    name: 'chatWithFinancialDataFlow',
    inputSchema: ChatWithFinancialDataInputSchema,
    outputSchema: ChatWithFinancialDataOutputSchema,
  },
  async (input) => {
    // Note: The project proposal explicitly requests using "OpenAI 4.0 mini GPT model for answering".
    // However, the provided genkit.ts initialization only configures `googleAI()` models,
    // and this task forbids modifying existing files like genkit.ts. Therefore, this flow
    // will use the default `googleai/gemini-2.5-flash` model as configured in `src/ai/genkit.ts`.
    // To use OpenAI models, the `@genkit-ai/openai` plugin would need to be added to genkit.ts.

    const {output} = await chatWithFinancialDataPrompt(input);
    return output!;
  }
);

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  return chatWithFinancialDataFlow(input);
}
