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

export interface SavingsOpportunity {
  id: string;
  category: string;
  currentSpending: number;
  suggestedReduction: number;
  potentialAnnualSavings: number;
  reason: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrowMyMoneySettings {
  id?: string;
  userId: string;
  monthlyIncome?: number;
  acceptedTargets: Record<string, number>; // category -> monthly reduction amount in ₹
  dismissedOpportunities: string[];       // category names or IDs
  goals: SavingsGoal[];
  investmentInputs?: {
    initialLumpsum?: number;
    monthlySIP?: number;
    durationYears?: number;
    returnRate?: number;
  };
  updatedAt?: string;
}