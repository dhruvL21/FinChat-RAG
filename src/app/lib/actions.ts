'use server';

import { chatWithFinancialData } from '@/ai/flows/chat-with-financial-data';
import type { RelevantChunk } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { ChatQueryInputSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function askFinancialQuestion(
  query: string, 
  context: RelevantChunk[],
  
  plannerContext?: any
) {
  const startTime = Date.now();
  const clientKey = 'global_client';

  // 1. Rate Limiting Check (relaxed to 30 requests/min)
  const rateLimit = await checkRateLimit(clientKey, { maxRequests: 30, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    logger.warn('ServerAction', 'askFinancialQuestion rate limit hit', { query, clientKey });
    return {
      answer: rateLimit.error || "Rate limit reached. Please wait a moment before sending your next question."
    };
  }

  // 2. Input Sanitization & Safe Context Clamping
  const safeContext = Array.isArray(context) 
    ? context.slice(0, 50).map(c => ({
        text: (c.text || '').trim() || 'Financial transaction record',
        metadata: {
          date: c.metadata?.date || new Date().toISOString().split('T')[0],
          category: c.metadata?.category || undefined,
          amount: (typeof c.metadata?.amount === 'number' && !isNaN(c.metadata.amount)) ? c.metadata.amount : undefined,
          fileName: c.metadata?.fileName || 'Statement'
        }
      }))
    : [];

  let safePlannerContext = undefined;
  if (plannerContext && typeof plannerContext === 'object') {
    safePlannerContext = {
      monthlyIncome: typeof plannerContext.monthlyIncome === 'number' ? plannerContext.monthlyIncome : undefined,
      monthlyExpenses: typeof plannerContext.monthlyExpenses === 'number' ? plannerContext.monthlyExpenses : undefined,
      monthlySurplus: typeof plannerContext.monthlySurplus === 'number' ? plannerContext.monthlySurplus : undefined,
      plannedSavings: typeof plannerContext.plannedSavings === 'number' ? plannerContext.plannedSavings : undefined,
      acceptedTargets: (plannerContext.acceptedTargets && typeof plannerContext.acceptedTargets === 'object') ? plannerContext.acceptedTargets : undefined,
      goals: Array.isArray(plannerContext.goals) ? plannerContext.goals.map((g: any) => ({
        name: String(g.name || 'Goal'),
        targetAmount: Number(g.targetAmount) || 0,
        currentSaved: Number(g.currentSaved) || 0,
        targetDate: String(g.targetDate || new Date().toISOString().split('T')[0])
      })) : undefined
    };
  }

  const validation = ChatQueryInputSchema.safeParse({
    userQuery: query,
    relevantChunks: safeContext,
    plannerContext: safePlannerContext
  });

  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join('; ');
    logger.warn('ServerAction', 'askFinancialQuestion input validation failed', { errorMsg, query });
    return {
      answer: `Validation Error: ${errorMsg}`
    };
  }

  logger.info('ServerAction', 'Executing askFinancialQuestion', {
    queryLength: query.length,
    chunksCount: safeContext.length,
    hasPlannerContext: Boolean(safePlannerContext)
  });

  try {
    const response = await chatWithFinancialData({
      userQuery: query,
      relevantChunks: safeContext,
      plannerContext: safePlannerContext
    });

    logger.info('ServerAction', 'askFinancialQuestion completed', {
      durationMs: Date.now() - startTime
    });

    return response;
  } catch (error: any) {
    logger.error('ServerAction', 'askFinancialQuestion failed', error, { query });
    return {
      answer: `An error occurred while processing your query (${error?.message || 'Unknown error'}). Please try again.`
    };
  }
}
