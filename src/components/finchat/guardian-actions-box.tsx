'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  RefreshCw,
  AlertTriangle,
  Bot
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { askFinancialQuestion } from '@/app/lib/actions';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Transaction, RelevantChunk } from '@/lib/types';

interface GuardianActionsBoxProps {
  allTransactions: Transaction[];
  monthlySpending: number;
  totalBalance: number;
  savingsRate: number;
  breachedBudget?: { name: string; spent: number; budget: number } | null;
  categoryData: { name: string; value: number }[];
  customBudgets: Record<string, number>;
}

type ActionKey = 'breach' | 'leaks' | 'recovery';

interface ActionOption {
  key: ActionKey;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  buttonLabel: string;
  theme: {
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconBorder: string;
    iconText: string;
    btnGradient: string;
    btnHover: string;
    borderActive: string;
    glow: string;
  };
  prompt: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    key: 'breach',
    title: 'Limit Breach Analysis',
    badge: 'AI Guardian',
    icon: ShieldCheck,
    description: 'Deep-dive into specific items and transactions that triggered budget alerts this period.',
    buttonLabel: 'Audit Limits',
    theme: {
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100/70',
      iconBorder: 'border-blue-200',
      iconText: 'text-blue-600',
      btnGradient: 'bg-blue-600',
      btnHover: 'hover:bg-blue-700',
      borderActive: 'border-blue-500 ring-2 ring-blue-500/20',
      glow: 'from-blue-50/50 to-sky-50/30',
    },
    prompt: 'Analyze my spending in detail. Which specific items and categories caused budget breaches? Provide a granular audit of excess transactions and give concrete recommendations to stay within guardrail limits.'
  },
  {
    key: 'leaks',
    title: 'Spending Leak Detection',
    badge: 'Anomaly AI',
    icon: TrendingUp,
    description: 'Detect hidden recurring charges, miscellaneous spikes, and unnecessary rupee drains.',
    buttonLabel: 'Detect Leaks',
    theme: {
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-100/70',
      iconBorder: 'border-emerald-200',
      iconText: 'text-emerald-700',
      btnGradient: 'bg-emerald-600',
      btnHover: 'hover:bg-emerald-700',
      borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
      glow: 'from-emerald-50/50 to-teal-50/30',
    },
    prompt: 'Analyze all my transactions for spending leaks, unnecessary recurring charges, anomalous spikes, and miscellaneous expenditure. Highlight top waste areas and calculate how much money can be saved immediately.'
  },
  {
    key: 'recovery',
    title: 'Budget Recovery Protocol',
    badge: 'Recovery',
    icon: PieChartIcon,
    description: 'Exceeded your monthly allowance? Generate a customized AI rebalancing roadmap for next month.',
    buttonLabel: 'Generate Plan',
    theme: {
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800 border-indigo-200',
      iconBg: 'bg-indigo-100/70',
      iconBorder: 'border-indigo-200',
      iconText: 'text-indigo-700',
      btnGradient: 'bg-indigo-600',
      btnHover: 'hover:bg-indigo-700',
      borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20',
      glow: 'from-indigo-50/50 to-blue-50/30',
    },
    prompt: 'I exceeded my monthly budget guardrails. Create a strict, step-by-step budget recovery protocol for next month to rebalance my finances, reduce discretionary spending, and restore savings rate.'
  }
];

function FormattedOutput({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1.5" />;
        }

        // Headings: ### or ####
        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <h5 key={index} className="font-extrabold text-xs sm:text-sm text-slate-900 pt-2 pb-0.5 border-b border-slate-200/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span>{headingText}</span>
            </h5>
          );
        }

        // Bullet points
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
        const textContent = isBullet ? trimmed.replace(/^[-*•]\s*/, '') : trimmed;

        // Parse bold segments **bold**
        const parts = textContent.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1">{formattedParts}</span>
            </div>
          );
        }

        return (
          <p key={index} className="text-slate-700">
            {formattedParts}
          </p>
        );
      })}
    </div>
  );
}

export function GuardianActionsBox({
  allTransactions,
  monthlySpending,
  totalBalance,
  savingsRate,
  breachedBudget,
  categoryData,
  customBudgets
}: GuardianActionsBoxProps) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const [activeKey, setActiveKey] = useState<ActionKey | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [outputTitle, setOutputTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const outputRef = useRef<HTMLDivElement>(null);

  const handleRunAction = async (option: ActionOption) => {
    setActiveKey(option.key);
    setOutputTitle(option.title);
    setIsLoading(true);
    setOutput(null);

    // Smooth scroll down to output area
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    try {
      // 1. Gather document chunks from Firestore
      const relevantChunks: RelevantChunk[] = [];
      if (user && db) {
        try {
          const docsRef = collection(db, 'users', user.uid, 'documents');
          const docsSnap = await getDocs(docsRef);

          for (const docSnap of docsSnap.docs) {
            if (docSnap.id.startsWith('settings_')) continue;
            const chunksRef = collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks');
            const chunksSnap = await getDocs(chunksRef);
            chunksSnap.forEach(chunk => {
              const cData = chunk.data();
              relevantChunks.push({
                text: cData.chunkText || 'Financial transaction record',
                metadata: {
                  date: cData.transactionDate || new Date().toISOString().split('T')[0],
                  category: cData.category || undefined,
                  amount: (cData.amount !== undefined && !isNaN(Number(cData.amount))) ? Number(cData.amount) : undefined,
                  fileName: docSnap.data().filename || 'Statement'
                }
              });
            });
          }
        } catch (fetchErr) {
          console.warn("Could not fetch Firestore document chunks:", fetchErr);
        }
      }

      // If no chunks from docs, synthesize from current allTransactions
      if (relevantChunks.length === 0 && allTransactions.length > 0) {
        allTransactions.slice(0, 35).forEach(tx => {
          relevantChunks.push({
            text: `Date: ${tx.date}, Item: ${tx.description}, Amount: ₹${tx.amount}, Category: ${tx.category}`,
            metadata: {
              date: tx.date,
              category: tx.category,
              amount: tx.amount,
              fileName: 'Current Ledger'
            }
          });
        });
      }

      // 2. Load Grow My Money planner context
      let plannerContext: any = undefined;
      if (user && db) {
        try {
          const settingsSnap = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_grow_my_money'));
          if (settingsSnap.exists()) {
            const sData = settingsSnap.data();
            plannerContext = {
              monthlyIncome: sData.monthlyIncome,
              acceptedTargets: sData.acceptedTargets,
              goals: sData.goals?.map((g: any) => ({
                name: g.name,
                targetAmount: g.targetAmount,
                currentSaved: g.currentSaved,
                targetDate: g.targetDate,
              })),
            };
          }
        } catch (pErr) {
          console.warn("Planner context load skipped:", pErr);
        }
      }

      // Enhance prompt with real-time financial stats
      const contextSummary = `
[CURRENT FINANCIAL SNAPSHOT]:
- Total Spent This Period: ₹${monthlySpending.toLocaleString('en-IN')}
- Total Balance: ₹${totalBalance.toLocaleString('en-IN')}
- Savings Rate: ${savingsRate}%
- Budget Alert: ${breachedBudget ? `Breached in '${breachedBudget.name}' by ₹${(breachedBudget.spent - breachedBudget.budget).toLocaleString('en-IN')} (Limit: ₹${breachedBudget.budget.toLocaleString('en-IN')}, Spent: ₹${breachedBudget.spent.toLocaleString('en-IN')})` : 'All categories within healthy limits'}
- Active Categories: ${categoryData.map(c => `${c.name}: ₹${c.value.toLocaleString('en-IN')}`).join(', ')}
`;

      const fullPrompt = `${option.prompt}\n\n${contextSummary}\n\nProvide a clear, structured executive summary with numbered action points, specific Rupee figures (₹), and actionable takeaways.`;

      // 3. Call AI Server Action
      const clampedChunks = relevantChunks.slice(0, 40);
      const res = await askFinancialQuestion(fullPrompt, clampedChunks, plannerContext);

      if (res && res.answer) {
        setOutput(res.answer);
      } else {
        throw new Error("No answer returned from AI model.");
      }
    } catch (err: any) {
      console.warn("AI generation failed or rate limited, providing structured local analysis:", err);
      // Fallback: Generate intelligent client-side diagnostics
      const fallbackReport = generateFallbackDiagnostic(option.key, {
        allTransactions,
        monthlySpending,
        totalBalance,
        savingsRate,
        breachedBudget,
        categoryData,
        customBudgets
      });
      setOutput(fallbackReport);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseOutput = () => {
    setOutput(null);
    setActiveKey(null);
  };

  return (
    <Card className="glass-card border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)] space-y-6">
      
      {/* Box Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              AI Guardian Actions & Diagnostics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Execute on-demand intelligence audits on your financial records. Output is generated directly below.
          </p>
        </div>

        <Badge variant="outline" className="self-start sm:self-auto bg-sky-50 text-blue-700 border-sky-200 text-[10px] font-bold px-3 py-1 rounded-full gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Interactive Diagnostics
        </Badge>
      </div>

      {/* The 3 Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {ACTION_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isCurrentActive = activeKey === opt.key;
          const isCurrentLoading = isLoading && isCurrentActive;

          return (
            <div
              key={opt.key}
              className={cn(
                "rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 text-slate-900 transition-all duration-300 flex flex-col p-5 shadow-[0_8px_20px_-3px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] hover:border-slate-300 hover:shadow-[0_16px_32px_-4px_rgba(0,0,0,0.22)] hover:-translate-y-0.5",
                isCurrentActive && opt.theme.borderActive
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2.5 rounded-xl border", opt.theme.iconBg, opt.theme.iconBorder, opt.theme.iconText)}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn("text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border", opt.theme.badgeBg, opt.theme.badgeText)}>
                  {opt.badge}
                </span>
              </div>

              <h4 className="font-extrabold text-sm tracking-tight mb-1.5 text-slate-900">
                {opt.title}
              </h4>
              
              <p className="text-xs text-slate-600 leading-relaxed mb-5 flex-1">
                {opt.description}
              </p>

              <Button
                size="sm"
                className={cn(
                  "w-full text-white font-bold mt-auto rounded-xl shadow-xs transition-all gap-1.5 cursor-pointer",
                  opt.theme.btnGradient,
                  opt.theme.btnHover
                )}
                disabled={isLoading}
                onClick={() => handleRunAction(opt)}
              >
                {isCurrentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>{opt.buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Output Display Container (Displayed right here when clicked!) */}
      <div ref={outputRef}>
        {isLoading && (
          <div className="p-6 rounded-2xl bg-sky-50/70 border border-sky-200/80 animate-in fade-in duration-300 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
            <div className="p-3 rounded-full bg-white border border-sky-200 shadow-sm text-blue-600">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-slate-900">
                Running {outputTitle || 'Intelligence Diagnostic'}...
              </h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Guardian AI is inspecting your indexed financial transactions, calculating guardrail thresholds, and preparing recommendations.
              </p>
            </div>
          </div>
        )}

        {output && !isLoading && (
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.18),0_4px_10px_rgba(0,0,0,0.08)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            
            {/* Output Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Diagnostic Report: {outputTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Generated from your indexed transactions and active guardrails
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-lg gap-1.5 text-slate-700 hover:bg-slate-50"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-lg gap-1.5 text-blue-700 bg-blue-50/60 hover:bg-blue-100/60 border-blue-200"
                  onClick={() => router.push(`/chat?q=${encodeURIComponent(`Following up on ${outputTitle}: How should I execute these steps?`)}`)}
                >
                  <span>Ask Finchat AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  onClick={handleCloseOutput}
                  aria-label="Close output"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Output Content */}
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/60 max-h-[480px] overflow-y-auto selection:bg-blue-100 pr-3">
              <FormattedOutput content={output} />
            </div>

            {/* Output Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Private & isolated to your secure session
              </span>

              <button
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => {
                  const opt = ACTION_OPTIONS.find(o => o.key === activeKey);
                  if (opt) handleRunAction(opt);
                }}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-run Audit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Intelligent Client-Side Fallback Generator
 * Ensures that if Gemini API hits rate limits or is offline, the user still receives
 * an authentic, accurate financial report calculated from their active transactions.
 */
function generateFallbackDiagnostic(
  key: ActionKey, 
  data: {
    allTransactions: Transaction[];
    monthlySpending: number;
    totalBalance: number;
    savingsRate: number;
    breachedBudget?: { name: string; spent: number; budget: number } | null;
    categoryData: { name: string; value: number }[];
    customBudgets: Record<string, number>;
  }
): string {
  const { allTransactions, monthlySpending, totalBalance, savingsRate, breachedBudget, categoryData } = data;

  if (key === 'breach') {
    if (breachedBudget) {
      const excess = breachedBudget.spent - breachedBudget.budget;
      const relevantTxs = allTransactions.filter(t => t.category.toLowerCase() === breachedBudget.name.toLowerCase());
      const topItems = relevantTxs.slice(0, 3).map(t => `  • ${t.description}: ₹${Math.abs(t.amount).toLocaleString('en-IN')} (${t.date})`).join('\n');

      return `🚨 LIMIT BREACH DIAGNOSIS

1. Primary Breach Identified:
   Category: '${breachedBudget.name}'
   Budget Guardrail: ₹${breachedBudget.budget.toLocaleString('en-IN')}
   Total Spent: ₹${breachedBudget.spent.toLocaleString('en-IN')}
   Overrun Amount: ₹${excess.toLocaleString('en-IN')} (${Math.round((excess / breachedBudget.budget) * 100)}% over limit)

2. Contributing High-Impact Items:
${topItems || '  • High cumulative frequency of smaller payments.'}

3. Recommended Remediation:
   • Enforce an immediate discretionary freeze on '${breachedBudget.name}' for the remainder of this cycle.
   • Transfer ₹${excess.toLocaleString('en-IN')} from flexible reserves or reduce next month's allowance to preserve your annual savings target.
   • Set up real-time threshold notifications at 75% utilization to prevent future breaches.`;
    }

    return `✅ LIMIT BREACH AUDIT: HEALTHY STATUS

1. Guardrail Status:
   All categorized spending is currently within allocated thresholds.
   Total Period Expenditure: ₹${monthlySpending.toLocaleString('en-IN')}
   Current Savings Rate: ${savingsRate}%

2. Proactive Observations:
   • Highest active expenditure category: ${categoryData.length > 0 ? `'${categoryData[0].name}' at ₹${categoryData[0].value.toLocaleString('en-IN')}` : 'No active expenses'}.
   • Continue maintaining regular logging to ensure anomaly detection models retain high precision.`;
  }

  if (key === 'leaks') {
    const miscSpent = categoryData.find(c => c.name.toLowerCase() === 'miscellaneous')?.value || 0;
    const sortedCats = [...categoryData].sort((a, b) => b.value - a.value);
    const top2 = sortedCats.slice(0, 2);

    return `🔍 SPENDING LEAK DETECTION REPORT

1. Potential Leak Indicators:
   • Uncategorized / Miscellaneous: ₹${miscSpent.toLocaleString('en-IN')}
     ${miscSpent > 5000 ? '⚠️ High unclassified outflow detected. Categorizing these transactions will clarify hidden subscription leaks.' : '✓ Miscellaneous outflow is within acceptable bounds (<₹5,000).'}

2. Highest Concentration Outflows:
${top2.map(c => `   • ${c.name}: ₹${c.value.toLocaleString('en-IN')} (${Math.round((c.value / (monthlySpending || 1)) * 100)}% of total)`).join('\n')}

3. Actionable Waste Reduction:
   • Audit recurring payments: Check for redundant streaming, app subscriptions, or gym memberships active over 60 days.
   • Establish an impulse buffer: Wait 48 hours for non-essential purchases exceeding ₹2,500.
   • Estimated potential monthly recovery: ₹${Math.round((monthlySpending * 0.12) || 3500).toLocaleString('en-IN')}.`;
  }

  // Recovery Protocol
  const recoveryTarget = breachedBudget ? (breachedBudget.spent - breachedBudget.budget) : Math.round(monthlySpending * 0.15);

  return `📋 30-DAY BUDGET RECOVERY ROADMAP

1. Recovery Objective:
   Target Surplus Restoration: ₹${recoveryTarget.toLocaleString('en-IN')}
   Current Period Spending: ₹${monthlySpending.toLocaleString('en-IN')}
   Current Liquid Reserve: ₹${totalBalance.toLocaleString('en-IN')}

2. Phase 1 (Days 1–10): Discretionary Pause
   • Implement temporary ceiling cuts on Food Outings & Shopping.
   • Target Immediate Recovery: ₹${Math.round(recoveryTarget * 0.4).toLocaleString('en-IN')}.

3. Phase 2 (Days 11–20): Fixed Limit Enforcement
   • Reallocate excess expenditure across remaining categories.
   • Target Mid-Period Recovery: ₹${Math.round(recoveryTarget * 0.35).toLocaleString('en-IN')}.

4. Phase 3 (Days 21–30): Target Rebalance
   • Route recovered surplus directly into high-yield emergency reserves or SIP investments to rebuild savings buffer.
   • Projected month-end savings rate improvement: +8% to +12%.`;
}

