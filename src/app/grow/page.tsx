'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  SlidersHorizontal,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Target,
  FileText,
  DollarSign,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import type { Transaction, SavingsGoal, SavingsOpportunity, GrowMyMoneySettings } from '@/lib/types';
import {
  calculateFinancialSummary,
  generateSavingsOpportunities,
  calculateGoalMetrics,
  formatINR,
  DEFAULT_BUDGETS,
  normalizeCategory
} from '@/lib/financial-engine';
import { IncomeDialog } from '@/components/finchat/grow/income-dialog';
import { AdjustReductionDialog } from '@/components/finchat/grow/adjust-reduction-dialog';
import { GoalDialog } from '@/components/finchat/grow/goal-dialog';
import { InvestmentExplorer } from '@/components/finchat/grow/investment-explorer';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { parseCSVLine, splitCSVLine } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SETTINGS_DOC_ID = 'settings_grow_my_money';
const LOCAL_STORAGE_KEY = 'finchat_grow_settings';

export default function GrowMyMoneyPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  
  // User settings
  const [customIncome, setCustomIncome] = useState<number | undefined>(undefined);
  const [acceptedTargets, setAcceptedTargets] = useState<Record<string, number>>({});
  const [dismissedOpportunities, setDismissedOpportunities] = useState<string[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  // Modals state
  const [adjustingCategory, setAdjustingCategory] = useState<SavingsOpportunity | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'invest'>('goals');

  // Load Transactions & Existing Settings
  const loadData = useCallback(async () => {
    if (!user || !db) return;
    setIsLoading(true);

    try {
      // 1. Load LocalStorage Settings as fast initial fallback
      if (typeof window !== 'undefined') {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.monthlyIncome) setCustomIncome(parsed.monthlyIncome);
            if (parsed.acceptedTargets) setAcceptedTargets(parsed.acceptedTargets);
            if (parsed.dismissedOpportunities) setDismissedOpportunities(parsed.dismissedOpportunities);
            if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
          } catch (e) {
            console.warn('Could not parse local grow settings:', e);
          }
        }
      }

      // 2. Load Firestore Settings
      try {
        const settingsRef = doc(db, 'users', user.uid, 'documents', SETTINGS_DOC_ID);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data() as Partial<GrowMyMoneySettings>;
          if (sData.monthlyIncome !== undefined) setCustomIncome(sData.monthlyIncome);
          if (sData.acceptedTargets) setAcceptedTargets(sData.acceptedTargets);
          if (sData.dismissedOpportunities) setDismissedOpportunities(sData.dismissedOpportunities);
          if (Array.isArray(sData.goals)) setGoals(sData.goals);
        }
      } catch (sErr) {
        console.warn('Could not load Firestore grow settings:', sErr);
      }

      // 3. Load Custom Budgets
      try {
        const budgetDoc = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_budgets'));
        if (budgetDoc.exists() && budgetDoc.data()?.budgets) {
          setCustomBudgets({ ...DEFAULT_BUDGETS, ...budgetDoc.data().budgets });
        }
      } catch (bErr) {
        console.warn('Could not load custom budgets:', bErr);
      }

      // 4. Load User Document Chunks (Transactions)
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const extractedTx: Transaction[] = [];

      for (const docSnap of docsSnapshot.docs) {
        // Skip settings documents
        if (docSnap.id.startsWith('settings_')) continue;

        const chunksSnapshot = await getDocs(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks')
        );

        chunksSnapshot.forEach((chunk) => {
          const data = chunk.data();
          const rawText = data.chunkText || '';
          const parsed = parseCSVLine(rawText);

          const amt = (data.amount !== undefined && !isNaN(Number(data.amount)) && Number(data.amount) > 0)
            ? Number(data.amount)
            : parsed.amount;

          let desc = parsed.description;
          if (!desc || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(desc) || desc.startsWith('TXN-')) {
            const parts = splitCSVLine(rawText);
            desc = parts.find((p: string) => p.trim() && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(p.trim()) && !p.trim().startsWith('TXN-'))?.trim() || 'Financial Transaction';
          }

          const dateStr = (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(data.transactionDate))
            ? data.transactionDate
            : parsed.date;

          extractedTx.push({
            id: chunk.id,
            date: dateStr,
            description: desc,
            amount: amt,
            category: data.category && data.category !== 'Miscellaneous' ? data.category : parsed.category,
            sourceFile: docSnap.data().filename || 'Statement',
          });
        });
      }

      setTransactions(extractedTx);
    } catch (err) {
      console.error('Error loading Grow My Money data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Settings Helper (Firestore + localStorage)
  const persistSettings = async (updates: Partial<GrowMyMoneySettings>) => {
    const nextIncome = updates.monthlyIncome !== undefined ? updates.monthlyIncome : customIncome;
    const nextTargets = updates.acceptedTargets !== undefined ? updates.acceptedTargets : acceptedTargets;
    const nextDismissed = updates.dismissedOpportunities !== undefined ? updates.dismissedOpportunities : dismissedOpportunities;
    const nextGoals = updates.goals !== undefined ? updates.goals : goals;

    const payload: GrowMyMoneySettings = {
      id: SETTINGS_DOC_ID,
      userId: user?.uid || 'guest',
      monthlyIncome: nextIncome,
      acceptedTargets: nextTargets,
      dismissedOpportunities: nextDismissed,
      goals: nextGoals,
      updatedAt: new Date().toISOString(),
    };

    // 1. Local storage immediate cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    }

    // 2. Firestore persist
    if (user && db) {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'documents', SETTINGS_DOC_ID);
        await setDoc(settingsRef, payload, { merge: true });
      } catch (err) {
        console.warn('Firestore settings update error:', err);
      }
    }
  };

  // 1. Calculate Core Financial Summary
  const summary = calculateFinancialSummary(transactions, customIncome);

  // 2. Calculate Total Potential Savings from Accepted Targets
  const potentialAdditionalSavings = Object.values(acceptedTargets).reduce((acc, val) => acc + val, 0);

  // 3. Planned Monthly Savings = Estimated Monthly Surplus + Potential Additional Savings
  const plannedMonthlySavings = Math.max(0, summary.monthlySurplus + potentialAdditionalSavings);

  // 4. Generate Savings Opportunities
  const opportunities = generateSavingsOpportunities(
    summary.categorySpendMap,
    customBudgets,
    acceptedTargets,
    dismissedOpportunities
  );

  // Action: Save Income
  const handleSaveIncome = async (newIncome: number) => {
    setCustomIncome(newIncome);
    await persistSettings({ monthlyIncome: newIncome });
    toast({
      title: 'Monthly Income Updated',
      description: `Your monthly income has been set to ${formatINR(newIncome)}. Surplus refreshed.`,
    });
  };

  // Action: Accept Savings Target
  const handleAcceptTarget = async (opp: SavingsOpportunity) => {
    const nextTargets = { ...acceptedTargets, [opp.category]: opp.suggestedReduction };
    setAcceptedTargets(nextTargets);
    await persistSettings({ acceptedTargets: nextTargets });
    toast({
      title: 'Savings Target Accepted',
      description: `Target of ${formatINR(opp.suggestedReduction)}/mo reduction for ${opp.category} activated.`,
    });
  };

  // Action: Adjust Savings Target
  const handleSaveAdjustment = async (category: string, newReduction: number) => {
    const nextTargets = { ...acceptedTargets, [category]: newReduction };
    setAcceptedTargets(nextTargets);
    await persistSettings({ acceptedTargets: nextTargets });
    toast({
      title: 'Target Adjusted',
      description: `Updated reduction for ${category} to ${formatINR(newReduction)}/mo.`,
    });
  };

  // Action: Dismiss Opportunity
  const handleDismissOpportunity = async (category: string) => {
    // If previously accepted, remove from accepted
    const nextTargets = { ...acceptedTargets };
    delete nextTargets[category];

    const nextDismissed = Array.from(new Set([...dismissedOpportunities, category]));
    setAcceptedTargets(nextTargets);
    setDismissedOpportunities(nextDismissed);
    await persistSettings({ acceptedTargets: nextTargets, dismissedOpportunities: nextDismissed });

    toast({
      title: 'Opportunity Dismissed',
      description: `${category} reduction suggestion hidden. You can reset anytime.`,
    });
  };

  // Action: Reset Dismissed
  const handleResetDismissed = async () => {
    setDismissedOpportunities([]);
    await persistSettings({ dismissedOpportunities: [] });
    toast({
      title: 'Opportunities Reset',
      description: 'All previously dismissed recommendations have been restored.',
    });
  };

  // Action: Save Goal (Create or Edit)
  const handleSaveGoal = async (goalData: Omit<SavingsGoal, 'id'> & { id?: string }) => {
    let nextGoals: SavingsGoal[] = [];
    if (goalData.id) {
      nextGoals = goals.map((g) => (g.id === goalData.id ? { ...g, ...goalData, updatedAt: new Date().toISOString() } : g));
    } else {
      const newGoal: SavingsGoal = {
        ...goalData,
        id: `goal_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      nextGoals = [...goals, newGoal];
    }

    setGoals(nextGoals);
    await persistSettings({ goals: nextGoals });
    toast({
      title: goalData.id ? 'Savings Goal Updated' : 'New Savings Goal Created',
      description: `${goalData.name} (${formatINR(goalData.targetAmount)}) is now active.`,
    });
  };

  // Action: Delete Goal
  const handleDeleteGoal = async (goalId: string) => {
    const nextGoals = goals.filter((g) => g.id !== goalId);
    setGoals(nextGoals);
    await persistSettings({ goals: nextGoals });
    toast({
      title: 'Goal Removed',
      description: 'The savings goal has been deleted.',
    });
  };

  return (
    <main className="max-w-7xl mx-auto w-full px-3 py-3 sm:p-6 md:p-8 space-y-5 sm:space-y-7 flex-1">
      
      {/* Page Title & Mission Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-slate-200/90 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
              Grow My Money
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Strategic Wealth Engine • INR (₹)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transform expense tracking into purposeful savings: discover realistic cuts, fund goals, and explore smart investment scenarios.
          </p>
        </div>

        {/* Quick CTA to Ask Finchat AI */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/chat?q=How%20much%20can%20I%20realistically%20save%20and%20invest%20every%20month?')}
            className="w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 border-sky-200 text-blue-700 hover:bg-sky-50 rounded-2xl h-9"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Consult AI Strategist</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          SECTION A: YOUR MONEY (Simple Monthly Savings Planner)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              Section A: Your Money
            </h2>
            <p className="text-xs text-slate-500">
              Consolidated monthly cash-flow overview based on uploaded records and accepted savings targets.
            </p>
          </div>
          <IncomeDialog currentIncome={summary.monthlyIncome} onSaveIncome={handleSaveIncome} />
        </div>

        {/* Financial Position Metric Cards: 2-col on mobile, 5-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          
          {/* Monthly Income */}
          <Card className="glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Monthly Income
                </span>
              </div>
              <div className="text-base xs:text-lg sm:text-2xl font-black text-slate-900 truncate">
                {summary.hasIncomeData ? formatINR(summary.monthlyIncome) : 'Not Set'}
              </div>
              <div className="flex items-center justify-between pt-1 text-[10px] sm:text-[11px]">
                <span className="text-slate-400 truncate">
                  {summary.isIncomeEstimated ? 'No doc income' : 'Configured'}
                </span>
                {!summary.hasIncomeData && (
                  <IncomeDialog
                    currentIncome={summary.monthlyIncome}
                    onSaveIncome={handleSaveIncome}
                    trigger={
                      <button className="text-blue-600 font-bold hover:underline shrink-0">
                        + Set
                      </button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Expenses */}
          <Card className="glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Monthly Expenses
                </span>
              </div>
              <div className="text-base xs:text-lg sm:text-2xl font-black text-rose-600 truncate">
                {formatINR(summary.monthlyExpenses)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 pt-1 truncate">
                {transactions.length > 0 ? `${transactions.length} records` : 'No expenses'}
              </p>
            </CardContent>
          </Card>

          {/* Estimated Monthly Surplus */}
          <Card className="glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Monthly Surplus
                </span>
              </div>
              <div className="text-base xs:text-lg sm:text-2xl font-black text-blue-700 truncate">
                {formatINR(summary.monthlySurplus)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 pt-1 truncate">
                Income - expenses
              </p>
            </CardContent>
          </Card>

          {/* Potential Additional Savings */}
          <Card className="glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all bg-sky-50/40">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                  Target Cuts
                </span>
              </div>
              <div className="text-base xs:text-lg sm:text-2xl font-black text-emerald-600 truncate">
                +{formatINR(potentialAdditionalSavings)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 pt-1 truncate">
                {Object.keys(acceptedTargets).length > 0
                  ? `${Object.keys(acceptedTargets).length} targets`
                  : '0 targets'}
              </p>
            </CardContent>
          </Card>

          {/* Planned Monthly Savings (Spans 2 columns on mobile as a highlight card) */}
          <Card className="col-span-2 lg:col-span-1 glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all bg-white">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Planned Savings
                </span>
                <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg xs:text-xl sm:text-2xl font-black text-emerald-700 truncate">
                {formatINR(plannedMonthlySavings)}/mo
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium pt-1 truncate">
                Surplus + targets ({formatINR(plannedMonthlySavings * 12)}/yr)
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Transparency & Disclaimer Note */}
        <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-start gap-2 text-[11px] text-slate-600">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            <strong>Accuracy Note:</strong> Figures are computed strictly from your uploaded ledger statements and active user settings. Potential expense reductions represent voluntary targets and are not counted as liquid bank balances. Actual savings depend on future transaction execution.
          </span>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: SAVINGS OPPORTUNITIES (Savings Opportunity Engine)
          ========================================================================= */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Section B: Savings Opportunities
              </h2>
              {opportunities.length > 0 && (
                <Badge variant="secondary" className="bg-sky-100 text-blue-800 text-[10px] font-bold rounded-full">
                  {opportunities.length} Actionable
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Data-backed expense reduction targets identified from category trends and guardrail breaches.
            </p>
          </div>

          {dismissedOpportunities.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDismissed}
              className="h-7 text-xs text-slate-500 hover:text-blue-600 gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restore {dismissedOpportunities.length} Dismissed</span>
            </Button>
          )}
        </div>

        {opportunities.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-sky-100 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Discretionary Overages Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All your recorded expenses are well within their guardrail limits, and no excessive discretionary leaks were detected. Keep maintaining your discipline!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {opportunities.map((opp) => {
              const isAccepted = opp.status === 'accepted';
              return (
                <div
                  key={opp.id}
                  className={`p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-3 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 ${
                    isAccepted
                      ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-400/20'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{opp.category}</span>
                        {isAccepted && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Accepted Target
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        Spend: {formatINR(opp.currentSpending)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug">
                      {opp.reason}
                    </p>

                    <div className="p-2.5 rounded-2xl bg-white/90 border border-sky-100/90 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Suggested Monthly Trim:</span>
                        <span className="font-black text-blue-700 text-sm">
                          {formatINR(opp.suggestedReduction)}/mo
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Annual Savings:</span>
                        <span className="font-bold text-emerald-600">
                          {formatINR(opp.potentialAnnualSavings)}/yr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-sky-100">
                    {!isAccepted ? (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptTarget(opp)}
                        className="flex-1 h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Target</span>
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs font-bold text-blue-700 bg-sky-100/80 h-7 rounded-xl">
                        <span>Active Target</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustingCategory(opp)}
                      className="h-7 text-xs font-semibold border-sky-200 text-slate-700 hover:bg-sky-50 rounded-xl px-2.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                      <span className="hidden sm:inline">Adjust</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissOpportunity(opp.category)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="Dismiss recommendation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION C: YOUR GOALS AND INVESTMENT EXPLORER
          ========================================================================= */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Section C: Your Goals & Investment Explorer
            </h2>
            <p className="text-xs text-slate-500">
              Establish targeted milestones and test deterministic wealth compounding scenarios.
            </p>
          </div>

          {/* Navigation Toggle between Goals & Investment Explorer */}
          <div className="flex items-center bg-sky-100/60 p-1 rounded-2xl border border-sky-200/80 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('goals')}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'goals'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Savings Goals ({goals.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invest')}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'invest'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Investment Explorer</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Savings Goal Planner */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Active Savings Goals</h3>
                <p className="text-[11px] text-slate-500">
                  Required monthly contributions are matched against your current estimated monthly surplus ({formatINR(summary.monthlySurplus)}).
                </p>
              </div>

              <GoalDialog
                onSaveGoal={handleSaveGoal}
                monthlySurplus={summary.monthlySurplus}
                trigger={
                  <Button size="sm" className="w-full sm:w-auto justify-center h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create Savings Goal</span>
                  </Button>
                }
              />
            </div>

            {goals.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-sky-100 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-sky-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No Savings Goals Set Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Setting specific targets (like an Emergency Fund, Tech Gadget, or Holiday) gives every Rupee of your planned savings a clear purpose.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGoal(null);
                    setGoalModalOpen(true);
                  }}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Start Your First Goal</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((goal) => {
                  const metrics = calculateGoalMetrics(goal, summary.monthlySurplus);
                  return (
                    <Card key={goal.id} className="glass-card border border-slate-200/90 shadow-[0_14px_28px_-4px_rgba(0,0,0,0.22),0_5px_12px_-2px_rgba(0,0,0,0.14)] hover:shadow-[0_22px_40px_-4px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900">{goal.name}</CardTitle>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Target: {goal.targetDate} ({metrics.monthsRemaining} mo remaining)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGoal(goal);
                                setGoalModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 rounded-lg"
                              title="Edit goal"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Delete goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Saved: {formatINR(goal.currentSaved)}</span>
                            <span className="font-bold text-slate-900">{formatINR(goal.targetAmount)}</span>
                          </div>
                          <Progress value={metrics.progressPercent} className="h-2 bg-sky-100" />
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                            <span>{metrics.progressPercent}% achieved</span>
                            <span>Remaining: {formatINR(metrics.remainingAmount)}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-sky-50/60 border border-sky-100/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Required Monthly:</span>
                          <span className="font-black text-blue-700 text-sm">
                            {formatINR(metrics.requiredMonthlyContribution)}/mo
                          </span>
                        </div>

                        {/* Surplus feasibility note */}
                        {metrics.isFeasible ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>On track with your {formatINR(summary.monthlySurplus)} surplus.</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5 text-amber-700 text-[11px] bg-amber-50/90 p-2 rounded-xl border border-amber-200/70">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                              Requires {formatINR(metrics.requiredMonthlyContribution)}/mo, exceeding surplus of {formatINR(summary.monthlySurplus)}/mo.
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Investment Explorer */}
        {activeTab === 'invest' && (
          <InvestmentExplorer
            plannedMonthlySavings={plannedMonthlySavings}
            monthlySurplus={summary.monthlySurplus}
          />
        )}
      </section>

      {/* Adjust Category Reduction Dialog Modal */}
      {adjustingCategory && (
        <AdjustReductionDialog
          category={adjustingCategory.category}
          currentSpending={adjustingCategory.currentSpending}
          initialReduction={adjustingCategory.suggestedReduction}
          open={Boolean(adjustingCategory)}
          onOpenChange={(isOpen) => !isOpen && setAdjustingCategory(null)}
          onSaveAdjustment={handleSaveAdjustment}
        />
      )}

      {/* Goal Creation/Edit Dialog Modal */}
      <GoalDialog
        goalToEdit={editingGoal}
        open={goalModalOpen}
        onOpenChange={(isOpen) => {
          setGoalModalOpen(isOpen);
          if (!isOpen) setEditingGoal(null);
        }}
        onSaveGoal={handleSaveGoal}
        monthlySurplus={summary.monthlySurplus}
      />

    </main>
  );
}
