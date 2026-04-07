'use server';

import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { chatWithFinancialData, ChatWithFinancialDataInput } from '@/ai/flows/chat-with-financial-data';
import type { Transaction, RelevantChunk } from '@/lib/types';

// In-memory mock store for demo purposes (server-side only)
// In a real app, this would be a vector database like ChromaDB
let vectorStore: RelevantChunk[] = [];
let transactions: Transaction[] = [];

export async function processFile(content: string, fileName: string, fileType: 'csv' | 'pdf') {
  // Simulate text chunking and indexing
  const chunks = content.split('\n\n').filter(Boolean);
  
  const newChunks: RelevantChunk[] = chunks.map(chunkText => ({
    text: chunkText,
    metadata: {
      date: new Date().toISOString().split('T')[0],
      fileName: fileName
    }
  }));

  vectorStore.push(...newChunks);

  // If it's a CSV, attempt to extract transactions
  if (fileType === 'csv') {
    const lines = content.split('\n').slice(1); // skip header
    for (const line of lines) {
      const [date, desc, amountStr] = line.split(',');
      if (date && desc && amountStr) {
        const amount = parseFloat(amountStr);
        const { category } = await categorizeExpense({ transactionDescription: desc });
        
        transactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date,
          description: desc,
          amount,
          category,
          sourceFile: fileName
        });
      }
    }
  }

  return { success: true };
}

export async function askFinancialQuestion(query: string, history: RelevantChunk[] = []) {
  // Perform simple keyword-based "retrieval" from our mock store
  const relevantChunks = vectorStore
    .filter(chunk => 
      chunk.text.toLowerCase().includes(query.toLowerCase()) || 
      query.toLowerCase().split(' ').some(word => chunk.text.toLowerCase().includes(word))
    )
    .slice(0, 5);

  // If no chunks match, provide some default context to avoid "empty context" errors
  const context = relevantChunks.length > 0 ? relevantChunks : vectorStore.slice(0, 5);

  const response = await chatWithFinancialData({
    userQuery: query,
    relevantChunks: context
  });

  return response;
}

export async function getTransactions() {
  return transactions;
}