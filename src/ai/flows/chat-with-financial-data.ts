'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const RelevantChunkSchema = z.object({
  text: z.string(),
  metadata: z.object({
    date: z.string(),
    category: z.string().optional(),
    amount: z.number().optional(),
    fileName: z.string(),
  }),
});

const PlannerSummarySchema = z.object({
  monthlyIncome: z.number().optional(),
  monthlyExpenses: z.number().optional(),
  monthlySurplus: z.number().optional(),
  plannedSavings: z.number().optional(),
  acceptedTargets: z.record(z.string(), z.number()).optional(),
  goals: z.array(z.object({
    name: z.string(),
    targetAmount: z.number(),
    currentSaved: z.number(),
    targetDate: z.string(),
  })).optional(),
}).optional();

const ChatWithFinancialDataInputSchema = z.object({
  userQuery: z.string().min(1, 'Query cannot be empty'),
  relevantChunks: z.array(RelevantChunkSchema),
  plannerContext: PlannerSummarySchema,
});

export type ChatWithFinancialDataInput = z.infer<typeof ChatWithFinancialDataInputSchema>;

export type ChatWithFinancialDataOutput = {
  answer: string;
};

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  const startTime = Date.now();
  logger.info('AIFlow:Chat', 'Initiating chat flow', { query: input.userQuery, chunksCount: input.relevantChunks?.length || 0 });

  const validation = ChatWithFinancialDataInputSchema.safeParse(input);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(', ');
    logger.warn('AIFlow:Chat', 'Input validation failed', { errorMsg });
    return { answer: `Input Validation Error: ${errorMsg}` };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('AIFlow:Chat', 'OPENAI_API_KEY missing in environment variables');
    return {
      answer: "API Configuration Missing: OPENAI_API_KEY is not set in environment variables. Please configure the key in your .env file."
    };
  }

  const openai = new OpenAI({ apiKey });

  const contextStr = (input.relevantChunks || []).map(chunk => {
    let details = `[Source: ${chunk.metadata?.fileName || 'Document'}] [Date: ${chunk.metadata?.date || 'Unknown'}]`;
    if (chunk.metadata?.category) details += ` [Category: ${chunk.metadata.category}]`;
    if (chunk.metadata?.amount !== undefined) details += ` [Amount: ₹${chunk.metadata.amount}]`;
    return `${details}\nContent: ${chunk.text}`;
  }).join('\n---\n');

  // Format planner context if provided
  let plannerStr = '';
  if (input.plannerContext) {
    const p = input.plannerContext;
    plannerStr = `\n### GROW MY MONEY FINANCIAL POSITION:\n`;
    if (p.monthlyIncome !== undefined) plannerStr += `- Monthly Income: ₹${p.monthlyIncome.toLocaleString('en-IN')}\n`;
    if (p.monthlyExpenses !== undefined) plannerStr += `- Monthly Expenses: ₹${p.monthlyExpenses.toLocaleString('en-IN')}\n`;
    if (p.monthlySurplus !== undefined) plannerStr += `- Estimated Monthly Surplus: ₹${p.monthlySurplus.toLocaleString('en-IN')}\n`;
    if (p.plannedSavings !== undefined) plannerStr += `- Planned Monthly Savings: ₹${p.plannedSavings.toLocaleString('en-IN')}\n`;
    if (p.acceptedTargets && Object.keys(p.acceptedTargets).length > 0) {
      plannerStr += `- Accepted Category Reduction Targets:\n`;
      Object.entries(p.acceptedTargets).forEach(([cat, amt]) => {
        plannerStr += `  * ${cat}: -₹${amt.toLocaleString('en-IN')}/mo (₹${(amt * 12).toLocaleString('en-IN')}/yr)\n`;
      });
    }
    if (p.goals && p.goals.length > 0) {
      plannerStr += `- Active Savings Goals:\n`;
      p.goals.forEach(g => {
        plannerStr += `  * "${g.name}": Target ₹${g.targetAmount.toLocaleString('en-IN')}, Saved ₹${g.currentSaved.toLocaleString('en-IN')}, Due ${g.targetDate}\n`;
      });
    }
  }

  const systemPrompt = `You are FinChat AI, an Elite Financial Guardian and Strategist. Your mission is to provide rigorous, data-driven analysis of the user's private financial data, always using Indian Rupees (₹) as the currency.

### MISSION-CRITICAL OPERATING DIRECTIVES:
1. **Budget Enforcement:** If the data shows spending in a category is high or has exceeded typical monthly targets, you MUST issue a professional warning.
   - Food Limit: ₹15,000
   - Shopping Limit: ₹8,000
   - Travel Limit: ₹10,000
2. **Item-Level Scrutiny:** Do not just provide totals. Look into transaction descriptions (the "items consumed") to find patterns of waste. Identify the "particular items" or vendors that are driving these costs.
3. **Strategic Absolute:** Your advice must be actionable. If the user is over limit, provide a "Recovery Protocol" to trim expenses in the coming weeks.
4. **Calculated Accuracy:** Sum all amounts precisely. If a user asks "how much did I spend," provide a hard number calculated from the context in ₹.
5. **Grow My Money & Planning Expertise:**
   - **Savings Potential & Category Reductions:**
     When asked "How much could I potentially save every month?" or "Which category could I reduce?", analyze discretionary spending (Shopping, Food/dining, Travel) vs guardrails. Calculate potential monthly reductions and state the annual savings impact (monthly * 12).
   - **Scenario Modeling:**
     When asked "What happens if I reduce shopping expenses by ₹1,000?", compute the direct impact: saving ₹1,000/mo creates ₹12,000 extra annual cash flow. Over 5 years at a hypothetical 12% equity index CAGR, a ₹1,000/mo SIP compounds to ~₹82,000.
   - **Goal Planning Calculations:**
     When asked "How much should I save monthly for a ₹X goal?", compute mathematically: (Target - Saved) / Months Remaining. Compare this against the user's estimated monthly surplus. If required contribution exceeds surplus, suggest adjusting timeline or trimming discretionary expenses.
   - **Investment Education:**
     - Fixed Deposit (FD): Guaranteed return (~6.5%–7.5% p.a.), insured up to ₹5 Lakh under DICGC, capital preservation, lock-in period with premature penalty.
     - Broad Market Index Fund (e.g. Nifty 50): Low-cost passive equity (<0.20% expense ratio), historical 11%–13% CAGR over 5+ years, no guaranteed returns, short-term market volatility.
     - Decision Framework (Priority Ladder):
       1. Essential living expenses & bills
       2. High-interest debt payoff (credit cards >36% p.a.)
       3. Emergency fund (3–6 months in liquid savings/FD)
       4. Near-term goals (<3 years)
       5. Long-term wealth creation (equity index funds >5 years)
     - Always advise securing emergency funds before deploying cash into volatile market investments.
   - **Regulatory Safeguard:** All investment return figures and calculations are illustrative only. Market-linked investments carry risk and can lose value.
6. **Persona:** You are an expert mentor. Be firm, mathematically precise, but encouraging. Your goal is the user's financial freedom.`;

  try {
    const userPromptContent = `### YOUR SOURCE OF TRUTH (CONTEXT):\n${contextStr || 'No document context found.'}\n${plannerStr}\n\n### USER QUERY:\n${input.userQuery}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptContent }
      ]
    });

    const answer = response.choices[0]?.message?.content || "I couldn't generate an analysis from the provided data.";
    logger.info('AIFlow:Chat', 'Chat flow completed successfully', { durationMs: Date.now() - startTime });
    return { answer };
  } catch (error: any) {
    logger.error('AIFlow:Chat', 'OpenAI chat completion error', error, { query: input.userQuery });
    return {
      answer: `AI Service Warning: An error occurred while calling OpenAI (${error?.message || 'Unknown network error'}). Please retry in a moment.`
    };
  }
}
