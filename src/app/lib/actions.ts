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

  // 1. Rate Limiting Check
  const rateLimit = await checkRateLimit(clientKey, { maxRequests: 10, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    logger.warn('ServerAction', 'askFinancialQuestion rate limit hit', { query, clientKey });
    return {
      answer: rateLimit.error || "Rate limit exceeded. Maximum 10 requests per minute allowed. Please wait 60 seconds."
    };
  }

  // 2. Input Validation & Safe Context Clamping
  const safeContext = Array.isArray(context) ? context.slice(0, 50) : [];

  const validation = ChatQueryInputSchema.safeParse({
    userQuery: query,
    relevantChunks: safeContext,
    plannerContext
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
    hasPlannerContext: Boolean(plannerContext)
  });

  try {
    const response = await chatWithFinancialData({
      userQuery: query,
      relevantChunks: safeContext,
      plannerContext
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
