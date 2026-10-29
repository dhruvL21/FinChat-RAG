import type { Transaction, SavingsOpportunity, SavingsGoal } from '@/lib/types';
import { detectCategoryFromBusiness } from '@/lib/categorizer';

export const DEFAULT_BUDGETS: Record<string, number> = {
  'Food': 15000,
  'Rent': 45000,
  'EMI': 25000,
  'Travel': 10000,
  'Shopping': 8000,
  'Utilities': 5000,
  'Healthcare': 10000,
  'Education': 15000,
  'Investment': 20000,
  'Miscellaneous': 10000,
};

// Discretionary categories where expenses can realistically be pruned
export const DISCRETIONARY_CATEGORIES = new Set([
  'Shopping',
  'Food',
  'Entertainment',
  'Travel',
  'Miscellaneous',
]);

// Essential categories that should NOT have arbitrary reduction suggestions
export const ESSENTIAL_CATEGORIES = new Set([
  'Rent',
  'EMI',
  'Healthcare',
  'Education',
  'Utilities',
  'Salary',
  'Investment',
]);

export const CATEGORY_ALIASES: Record<string, string> = {
  'food': 'Food', 'dining': 'Food', 'groceries': 'Food', 'restaurants': 'Food', 'swiggy': 'Food', 'zomato': 'Food', 'supermarket': 'Food', 'eats': 'Food',
  'rent': 'Rent', 'housing': 'Rent', 'lease': 'Rent', 'accommodation': 'Rent',
  'emi': 'EMI', 'loan': 'EMI', 'mortgage': 'EMI', 'debt': 'EMI',
  'travel': 'Travel', 'transport': 'Travel', 'uber': 'Travel', 'ola': 'Travel', 'fuel': 'Travel', 'cab': 'Travel', 'flight': 'Travel',
  'shopping': 'Shopping', 'clothing': 'Shopping', 'fashion': 'Shopping', 'amazon': 'Shopping', 'retail': 'Shopping',
  'utilities': 'Utilities', 'bills': 'Utilities', 'electricity': 'Utilities', 'wifi': 'Utilities', 'mobile': 'Utilities', 'water': 'Utilities', 'recharge': 'Utilities',
  'healthcare': 'Healthcare', 'medical': 'Healthcare', 'pharmacy': 'Healthcare', 'doctor': 'Healthcare',
  'education': 'Education', 'tuition': 'Education', 'books': 'Education',
  'salary': 'Salary', 'income': 'Salary',
  'investment': 'Investment', 'stocks': 'Investment', 'mutual fund': 'Investment', 'sip': 'Investment',
  'entertainment': 'Entertainment', 'movies': 'Entertainment', 'netflix': 'Entertainment', 'hotstar': 'Entertainment'
};

export function normalizeCategory(catStr: string, description?: string): string {
  if (!catStr && !description) return 'Miscellaneous';
  
  // 1. Direct alias check
  const lowerCat = (catStr || '').trim().toLowerCase();
  if (lowerCat && CATEGORY_ALIASES[lowerCat]) {
    return CATEGORY_ALIASES[lowerCat];
  }

  // 2. Intelligent business / merchant detection from description or category string
  const textToInspect = `${catStr || ''} ${description || ''}`.trim();
  if (textToInspect) {
    const detected = detectCategoryFromBusiness(textToInspect);
    if (detected.confidence !== 'low') {
      return detected.category;
    }
  }

  return catStr && catStr !== 'Miscellaneous' 
    ? catStr.charAt(0).toUpperCase() + catStr.slice(1) 
    : 'Miscellaneous';
}

export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

export interface FinancialSummaryResult {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  isIncomeEstimated: boolean;
  hasIncomeData: boolean;
  categorySpendMap: Record<string, number>;
  totalTransactionsCount: number;
}

/**
 * Calculates deterministic income, expenses, and surplus from transactions
 */
export function calculateFinancialSummary(
  transactions: Transaction[],
  customMonthlyIncome?: number
): FinancialSummaryResult {
  const categorySpendMap: Record<string, number> = {};
  let totalIncomeRecorded = 0;
  let totalExpenseRecorded = 0;

  transactions.forEach((tx) => {
    const normCat = normalizeCategory(tx.category || 'Miscellaneous');
    const isIncome = normCat === 'Salary' || normCat === 'Income' || tx.amount < 0;

    if (isIncome) {
      totalIncomeRecorded += Math.abs(tx.amount);
    } else if (tx.amount > 0) {
      totalExpenseRecorded += tx.amount;
      categorySpendMap[normCat] = (categorySpendMap[normCat] || 0) + tx.amount;
    }
  });

  // Effective income: User-entered income overrides or supplements recorded transactions
  const hasRecordedIncome = totalIncomeRecorded > 0;
  const effectiveIncome = (customMonthlyIncome && customMonthlyIncome > 0)
    ? customMonthlyIncome
    : totalIncomeRecorded;

  const monthlySurplus = Math.max(0, effectiveIncome - totalExpenseRecorded);

  return {
    monthlyIncome: Math.round(effectiveIncome),
    monthlyExpenses: Math.round(totalExpenseRecorded),
    monthlySurplus: Math.round(monthlySurplus),
    isIncomeEstimated: !hasRecordedIncome && !customMonthlyIncome,
    hasIncomeData: hasRecordedIncome || Boolean(customMonthlyIncome && customMonthlyIncome > 0),
    categorySpendMap,
    totalTransactionsCount: transactions.length,
  };
}

/**
 * Savings Opportunity Engine
 * Evaluates spending against budgets and discretionary flags without arbitrary assumptions
 */
export function generateSavingsOpportunities(
  categorySpendMap: Record<string, number>,
  budgets: Record<string, number> = DEFAULT_BUDGETS,
  acceptedTargets: Record<string, number> = {},
  dismissedCategories: string[] = []
): SavingsOpportunity[] {
  const dismissedSet = new Set(dismissedCategories);
  const opportunities: SavingsOpportunity[] = [];

  // Sort categories by spend descending
  const sortedCategories = Object.entries(categorySpendMap)
    .sort(([, a], [, b]) => b - a);

  for (const [category, currentSpend] of sortedCategories) {
    if (dismissedSet.has(category)) {
      continue;
    }

    const budgetLimit = budgets[category] || DEFAULT_BUDGETS[category] || 10000;
    const isDiscretionary = DISCRETIONARY_CATEGORIES.has(category);
    const isOverBudget = currentSpend > budgetLimit;

    // We only suggest reductions for reducible categories or over-budget discretionary spend
    if (!isDiscretionary && !isOverBudget) {
      continue;
    }

    let defaultReduction = 0;
    let reason = '';

    if (isOverBudget) {
      const overage = currentSpend - budgetLimit;
      // Propose bringing spend back down to budget, or a 20-30% trim
      defaultReduction = Math.max(500, Math.min(overage, Math.round(currentSpend * 0.25 / 100) * 100));
      reason = `Current monthly spend of ${formatINR(currentSpend)} exceeds your guardrail limit of ${formatINR(budgetLimit)} by ${formatINR(overage)}.`;
    } else if (isDiscretionary && currentSpend >= 2500) {
      // Modest 15% reduction for non-over-budget discretionary items
      defaultReduction = Math.max(500, Math.round(currentSpend * 0.15 / 100) * 100);
      reason = `Discretionary category with ${formatINR(currentSpend)} monthly outlay. A moderate 15% optimization frees cash for your goals.`;
    }

    if (defaultReduction > 0) {
      const isAccepted = acceptedTargets[category] !== undefined;
      const reduction = isAccepted ? acceptedTargets[category] : defaultReduction;

      opportunities.push({
        id: `opp_${category.toLowerCase()}`,
        category,
        currentSpending: Math.round(currentSpend),
        suggestedReduction: Math.round(reduction),
        potentialAnnualSavings: Math.round(reduction * 12),
        reason,
        status: isAccepted ? 'accepted' : 'pending',
      });
    }
  }

  return opportunities;
}

/**
 * Calculates remaining contribution, feasibility vs surplus, and progress
 */
export function calculateGoalMetrics(goal: SavingsGoal, monthlySurplus: number) {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentSaved);
  
  // Calculate months difference
  const today = new Date();
  const target = new Date(goal.targetDate);
  const monthsDiff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  const monthsRemaining = Math.max(1, monthsDiff);
  
  const requiredMonthlyContribution = Math.ceil(remainingAmount / monthsRemaining);
  const progressPercent = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));
  const isPastDeadline = target.getTime() < today.getTime();
  const isFeasible = monthlySurplus >= requiredMonthlyContribution;
  const shortfall = Math.max(0, requiredMonthlyContribution - monthlySurplus);

  return {
    remainingAmount,
    monthsRemaining,
    requiredMonthlyContribution,
    progressPercent,
    isPastDeadline,
    isFeasible,
    shortfall,
  };
}

/**
 * Deterministic Investment Scenario Calculator (Compound Lumpsum + Monthly SIP Annuity Due)
 */
export function calculateInvestmentScenario(
  initialLumpsum: number = 0,
  monthlySIP: number = 5000,
  durationYears: number = 5,
  annualReturnPercent: number = 12
) {
  const r = annualReturnPercent / 100;
  const t = Math.max(1, durationYears);
  const lumpsum = Math.max(0, initialLumpsum);
  const sip = Math.max(0, monthlySIP);

  // 1. Future Value of Lumpsum: P * (1 + r)^t
  const fvLumpsum = lumpsum * Math.pow(1 + r, t);

  // 2. Future Value of Monthly SIP (compounded monthly, annuity due)
  const i = r / 12;
  const n = t * 12;
  let fvSIP = 0;
  if (i > 0) {
    fvSIP = sip * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  } else {
    fvSIP = sip * n;
  }

  const totalInvested = Math.round(lumpsum + (sip * n));
  const totalMaturityValue = Math.round(fvLumpsum + fvSIP);
  const estimatedWealthGain = Math.max(0, totalMaturityValue - totalInvested);

  return {
    totalInvested,
    estimatedWealthGain,
    totalMaturityValue,
    durationYears: t,
    annualReturnPercent,
  };
}
