'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const RelevantChunkSchema = z.object({
  text: z.string(),
  metadata: z.object({
    date: z.string(),
    category: z.string().optional(),
    amount: z.number().optional(),
    fileName: z.string(),
  }),
});

const ChatWithFinancialDataInputSchema = z.object({
  userQuery: z.string(),
  relevantChunks: z.array(RelevantChunkSchema),
});

export type ChatWithFinancialDataInput = z.infer<typeof ChatWithFinancialDataInputSchema>;

export type ChatWithFinancialDataOutput = {
  answer: string;
};

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      answer: "OPENAI_API_KEY is missing in environment variables. Please add OPENAI_API_KEY to your .env file."
    };
  }

  const openai = new OpenAI({ apiKey });

  const contextStr = (input.relevantChunks || []).map(chunk => {
    let details = `[Source: ${chunk.metadata?.fileName || 'Document'}] [Date: ${chunk.metadata?.date || 'Unknown'}]`;
    if (chunk.metadata?.category) details += ` [Category: ${chunk.metadata.category}]`;
    if (chunk.metadata?.amount !== undefined) details += ` [Amount: ₹${chunk.metadata.amount}]`;
    return `${details}\nContent: ${chunk.text}`;
  }).join('\n---\n');

  const systemPrompt = `You are FinChat AI, an Elite Financial Guardian and Strategist. Your mission is to provide rigorous, data-driven analysis of the user's private financial data, always using Indian Rupees (₹) as the currency.

### MISSION-CRITICAL OPERATING DIRECTIVES:
1. **Budget Enforcement:** If the data shows spending in a category is high or has exceeded typical monthly targets, you MUST issue a professional warning.
   - Food Limit: ₹15,000
   - Shopping Limit: ₹8,000
   - Travel Limit: ₹10,000
2. **Item-Level Scrutiny:** Do not just provide totals. Look into the transaction descriptions (the "items consumed") to find patterns of waste. Identify the "particular items" or vendors that are driving these costs.
3. **Strategic Absolute:** Your advice must be actionable. If the user is over limit, provide a "Recovery Protocol" to trim expenses in the coming weeks.
4. **Calculated Accuracy:** Sum all amounts precisely. If a user asks "how much did I spend," provide a hard number calculated from the context in ₹.
5. **Persona:** You are an expert mentor. Be firm but encouraging. Your goal is the user's financial freedom.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `### YOUR SOURCE OF TRUTH (CONTEXT):\n${contextStr || 'No document context found.'}\n\n### USER QUERY:\n${input.userQuery}` }
      ]
    });

    const answer = response.choices[0]?.message?.content || "I couldn't generate an analysis from the provided data.";
    return { answer };
  } catch (error: any) {
    console.error("OpenAI chat error:", error);
    return {
      answer: `An error occurred while calling OpenAI (${error?.message || 'Unknown error'}). Please try again.`
    };
  }
}

