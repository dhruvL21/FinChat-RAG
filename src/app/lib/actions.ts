
'use server';

import { chatWithFinancialData } from '@/ai/flows/chat-with-financial-data';
import type { RelevantChunk } from '@/lib/types';

export async function askFinancialQuestion(query: string, context: RelevantChunk[]) {
  // Use the context provided from the client-side Firestore query
  const response = await chatWithFinancialData({
    userQuery: query,
    relevantChunks: context
  });

  return response;
}
