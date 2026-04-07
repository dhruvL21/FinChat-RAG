export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  sourceFile: string;
}

export interface FinancialDocument {
  id: string;
  name: string;
  type: 'pdf' | 'csv';
  uploadDate: string;
  status: 'processing' | 'indexed' | 'error';
}

export interface RelevantChunk {
  text: string;
  metadata: {
    date: string;
    category?: string;
    amount?: number;
    fileName: string;
  };
}