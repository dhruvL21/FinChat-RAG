'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddExpenseDialog } from '@/components/finchat/add-expense-dialog';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  DollarSign,
  Loader2,
  TrendingDown,
  AlertCircle,
  PieChart as PieChartIcon,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import type { Transaction } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';
import { cn, parseCSVLine, splitCSVLine } from '@/lib/utils';
import { EditBudgetDialog } from '@/components/finchat/edit-budget-dialog';
import { GuardianActionsBox } from '@/components/finchat/guardian-actions-box';
import { detectCategoryFromBusiness, cleanMerchantName } from '@/lib/categorizer';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#6366f1', '#14b8a6', '#ec4899', '#64748b'];

const DEFAULT_BUDGETS: Record<string, number> = { 
  'Food': 15000, 
  'Rent': 45000, 
  'EMI': 25000,
  'Travel': 10000, 
  'Shopping': 8000, 
  'Utilities': 5000,
  'Healthcare': 10000,
  'Education': 15000,
  'Investment': 20000,
  'Miscellaneous': 10000
};

export default function DashboardPage() {
  const router = useRouter();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlySpending: 0,
    savingsRate: 0,
    projectedTax: 0
  });
  const [chartData, setChartData] = useState<{name: string, spent: number}[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string, value: number, color: string}[]>([]);
  const [budgetData, setBudgetData] = useState<{name: string, spent: number, budget: number, percent: number}[]>([]);
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { user } = useUser();
  const db = useFirestore();

  const loadData = useCallback(async () => {
    if (!user || !db) return;
    
    setIsLoading(true);
    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const allExtractedTransactions: Transaction[] = [];
      
      const start = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : null;
      const end = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : null;

      for (const docSnap of docsSnapshot.docs) {
        if (docSnap.id.startsWith('settings_')) continue;
        const chunksSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'));
        
        chunksSnapshot.forEach(chunk => {
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

          allExtractedTransactions.push({
            id: chunk.id,
            date: dateStr,
            description: desc,
            amount: amt,
            category: data.category && data.category !== 'Miscellaneous' ? data.category : parsed.category,
            sourceFile: docSnap.data().filename
          });
        });
      }

      if (allExtractedTransactions.length === 0) {
        setAllTransactions([]);
        setRecentTransactions([]);
        setStats({
          totalBalance: 0,
          monthlySpending: 0,
          savingsRate: 0,
          projectedTax: 0
        });
        setChartData([{ name: 'No Data', spent: 0 }]);
        setCategoryData([]);
        setBudgetData([]);
        setIsLoading(false);
        return;
      }

      let activeTransactions = allExtractedTransactions;
      if (start && end) {
        activeTransactions = allExtractedTransactions.filter(tx => tx.date >= start && tx.date <= end);
      } else if (start) {
        activeTransactions = allExtractedTransactions.filter(tx => tx.date >= start);
      }

      // Category Aliases & Normalization
      const categoryAliases: Record<string, string> = {
        'food': 'Food', 'dining': 'Food', 'groceries': 'Food', 'restaurants': 'Food', 'swiggy': 'Food', 'zomato': 'Food', 'supermarket': 'Food', 'eats': 'Food',
        'rent': 'Rent', 'housing': 'Rent', 'lease': 'Rent', 'accommodation': 'Rent',
        'emi': 'EMI', 'loan': 'EMI', 'mortgage': 'EMI', 'debt': 'EMI',
        'travel': 'Travel', 'transport': 'Travel', 'uber': 'Travel', 'ola': 'Travel', 'fuel': 'Travel', 'cab': 'Travel', 'flight': 'Travel',
        'shopping': 'Shopping', 'clothing': 'Shopping', 'fashion': 'Shopping', 'amazon': 'Shopping', 'retail': 'Shopping',
        'utilities': 'Utilities', 'bills': 'Utilities', 'electricity': 'Utilities', 'wifi': 'Utilities', 'mobile': 'Utilities', 'water': 'Utilities', 'recharge': 'Utilities',
        'healthcare': 'Healthcare', 'medical': 'Healthcare', 'pharmacy': 'Healthcare', 'doctor': 'Healthcare',
        'education': 'Education', 'tuition': 'Education', 'books': 'Education',
        'salary': 'Salary', 'income': 'Salary',
        'investment': 'Investment', 'stocks': 'Investment'
      };

      const normalizeCategory = (catStr: string, description?: string, isIncome?: boolean): string => {
        const lower = (catStr || '').trim().toLowerCase();
        if (lower && categoryAliases[lower]) {
          return categoryAliases[lower];
        }
        // If unclassified or generic, automatically detect from business / merchant name
        if (!catStr || catStr === 'Miscellaneous' || lower === 'expense' || lower === 'debit') {
          if (description) {
            const detected = detectCategoryFromBusiness(description, Boolean(isIncome));
            if (detected.confidence !== 'low') {
              return detected.category;
            }
          }
        }
        return (catStr && catStr !== 'Miscellaneous') ? (catStr.charAt(0).toUpperCase() + catStr.slice(1)) : 'Miscellaneous';
      };

      const normalizedCatMap: Record<string, number> = {};
      const normalizedTransactions = activeTransactions.map(tx => {
        const isIncomeAmount = tx.amount < 0;
        const normCat = normalizeCategory(tx.category || 'Miscellaneous', tx.description, isIncomeAmount);
        const isIncome = normCat === 'Salary' || normCat === 'Income' || isIncomeAmount;
        if (tx.amount > 0 && !isIncome) {
          normalizedCatMap[normCat] = (normalizedCatMap[normCat] || 0) + tx.amount;
        }
        return { ...tx, category: normCat };
      });

      const sorted = [...normalizedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllTransactions(sorted);
      setRecentTransactions(sorted.slice(0, 10));

      const totalSpent = normalizedTransactions.reduce((acc, tx) => {
        const isIncome = tx.category === 'Salary' || tx.category === 'Income' || tx.amount < 0;
        return acc + (!isIncome && tx.amount > 0 ? tx.amount : 0);
      }, 0);

      const totalIncome = normalizedTransactions.reduce((acc, tx) => {
        const isIncome = tx.category === 'Salary' || tx.category === 'Income' || tx.amount < 0;
        return acc + (isIncome ? Math.abs(tx.amount) : 0);
      }, 0);
      
      const calculatedBalance = totalIncome > 0 ? Math.max(0, totalIncome - totalSpent) : 0;
      setStats({
        totalBalance: calculatedBalance, 
        monthlySpending: totalSpent,
        savingsRate: totalIncome > 0 
          ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalSpent) / totalIncome) * 100))) 
          : 0,
        projectedTax: Math.round(totalIncome * 0.15) 
      });

      // Monthly Chart Data (Expenditures)
      const monthMap: Record<string, number> = {};
      normalizedTransactions.forEach(tx => {
        const isIncome = tx.category === 'Salary' || tx.category === 'Income' || tx.amount < 0;
        if (!isIncome && tx.amount > 0) {
          const month = tx.date ? new Date(tx.date).toLocaleString('default', { month: 'short' }) : 'Recent';
          monthMap[month] = (monthMap[month] || 0) + tx.amount;
        }
      });
      const formattedChart = Object.entries(monthMap).map(([name, spent]) => ({ name, spent: Math.round(spent) }));
      setChartData(formattedChart.length > 0 ? formattedChart : [{ name: 'Total', spent: Math.round(totalSpent) }]);

      // Expense Category Distribution Data
      const formattedCat = Object.entries(normalizedCatMap).map(([name, value], i) => ({
        name,
        value: Math.round(value),
        color: COLORS[i % COLORS.length]
      }));
      setCategoryData(formattedCat);

      // Load custom budget limits from localStorage & Firestore
      let userBudgets = DEFAULT_BUDGETS;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('finchat_custom_budgets');
        if (stored) {
          try {
            userBudgets = { ...DEFAULT_BUDGETS, ...JSON.parse(stored) };
          } catch (e) {
            console.warn("Invalid localStorage budget JSON:", e);
          }
        }
      }

      try {
        const budgetDoc = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_budgets'));
        if (budgetDoc.exists() && budgetDoc.data()?.budgets) {
          userBudgets = { ...userBudgets, ...budgetDoc.data().budgets };
        }
      } catch (bErr) {
        console.warn("Could not load Firestore custom budget limits:", bErr);
      }
      setCustomBudgets(userBudgets);

      const allBudgetNames = Array.from(new Set([...Object.keys(userBudgets), ...Object.keys(normalizedCatMap)]));
      const formattedBudget = allBudgetNames.map((name) => {
        const spent = normalizedCatMap[name] || 0;
        const budget = userBudgets[name] || 10000;
        return {
          name,
          spent: Math.round(spent),
          budget,
          percent: Math.round((spent / budget) * 100)
        };
      });

      formattedBudget.sort((a, b) => b.spent - a.spent);
      setBudgetData(formattedBudget);

    } catch (err) {
      console.error("Error loading Overview data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, db, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const breachedBudget = budgetData.find(b => b.percent > 100);

  return (
    <main className="max-w-7xl mx-auto w-full px-3 py-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex-1">
        
        {/* Top Control Bar on Main Dashboard */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-slate-200/90 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                Portfolio Health & Intelligence
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Guardian Shield Active • INR (₹)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live INR (₹) analytics, smart guardrail tracking, and AI anomaly detection.
            </p>
          </div>

          {/* Action Controls: Date Range, Add Expense in one line */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <DatePickerWithRange onRangeChange={setDateRange} />
            <AddExpenseDialog onExpenseAdded={loadData} />
          </div>
        </div>

        {/* Guardian Alert Banner (If budget breached) */}
        {breachedBudget && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200/80 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-700">Guardian Insight Alert</span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-800">
                    Budget Breached
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-rose-950 font-medium mt-0.5">
                  Budget limit breached in <strong>'{breachedBudget.name}'</strong> by <strong>₹{(breachedBudget.spent - breachedBudget.budget).toLocaleString('en-IN')}</strong>. Tighten limits to protect your targets.
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full sm:w-auto shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 justify-center h-8 sm:h-9"
              onClick={() => router.push(`/chat?q=${encodeURIComponent(`Analyze the budget breach in '${breachedBudget.name}' by ₹${breachedBudget.spent - breachedBudget.budget} and recommend immediate spending cuts.`)}`)}
            >
              <span>Consult Guardian AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {[
              { 
                title: 'Total Balance', 
                value: `₹${stats.totalBalance.toLocaleString('en-IN')}`, 
                icon: Wallet, 
                badge: 'Live Indexed',
                iconContainer: 'bg-blue-50 text-blue-600 border-blue-100',
                borderHover: 'hover:border-blue-300'
              },
              { 
                title: 'Period Spending', 
                value: `₹${stats.monthlySpending.toLocaleString('en-IN')}`, 
                icon: CreditCard, 
                badge: 'Period Total',
                iconContainer: 'bg-rose-50 text-rose-600 border-rose-100',
                borderHover: 'hover:border-rose-300'
              },
              { 
                title: 'Savings Rate', 
                value: `${stats.savingsRate}%`, 
                icon: ArrowUpRight, 
                badge: stats.savingsRate >= 20 ? 'Target Achieved (≥20%)' : 'Below Target (<20%)',
                badgePositive: stats.savingsRate >= 20,
                iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                borderHover: 'hover:border-emerald-300'
              },
              { 
                title: 'Projected Tax', 
                value: `₹${stats.projectedTax.toLocaleString('en-IN')}`, 
                icon: DollarSign, 
                badge: 'FY Reserve Estimate',
                iconContainer: 'bg-amber-50 text-amber-600 border-amber-100',
                borderHover: 'hover:border-amber-300'
              },
            ].map((stat, i) => (
              <Card key={i} className={cn("glass-card border border-slate-200/90 rounded-2xl transition-all duration-300 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_48px_-4px_rgba(0,0,0,0.36)] hover:-translate-y-1", stat.borderHover)}>
                <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-5 pb-1 sm:pb-2">
                  <CardTitle className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">{stat.title}</CardTitle>
                  <div className={cn("p-1.5 sm:p-2 rounded-xl border shrink-0", stat.iconContainer)}>
                    <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
                  <div className="text-base xs:text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{stat.value}</div>
                  <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border truncate max-w-full",
                      stat.badgePositive !== undefined
                        ? (stat.badgePositive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {stat.badge}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 1: Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="glass-card border border-slate-200/90 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Spending Trends</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Visual timeline of periodic expenditure (INR)</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                  Timeline
                </Badge>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px] pr-0 pt-4">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -10, right: 15, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }} 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: '16px', 
                          border: '1px solid #bae6fd', 
                          boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.15)',
                          color: '#0f172a',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                        itemStyle={{ color: '#0284c7' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                      />
                      <Bar dataKey="spent" radius={[6, 6, 0, 0]} barSize={38}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === chartData.length - 1 ? '#2563eb' : '#93c5fd'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border border-slate-200/90 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 shrink-0">
                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Expense Distribution</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Categorized spending patterns</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                  Breakdown
                </Badge>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="48%"
                        innerRadius={68}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#ffffff" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: '16px', 
                          border: '1px solid #bae6fd', 
                          boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.15)',
                          color: '#0f172a',
                          fontSize: '12px',
                          fontWeight: 600
                        }} 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Legend verticalAlign="bottom" height={40} iconSize={9} wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center px-8 font-medium italic">
                    No transactions detected for this period. Upload a bank statement or add an expense.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 2: AI Guardian Actions Box with 3 Options & Inline Output */}
          <GuardianActionsBox
            allTransactions={allTransactions}
            monthlySpending={stats.monthlySpending}
            totalBalance={stats.totalBalance}
            savingsRate={stats.savingsRate}
            breachedBudget={breachedBudget}
            categoryData={categoryData}
            customBudgets={customBudgets}
          />

          {/* Section 3: Guardrails & Activity Log Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="glass-card border border-slate-200/90 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 shrink-0">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Budget Guardrails</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Real-time category limit monitoring (INR)</CardDescription>
                  </div>
                </div>
                <EditBudgetDialog 
                  currentBudgets={customBudgets} 
                  onBudgetsUpdated={(updated) => {
                    setCustomBudgets(updated);
                    loadData();
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-5 max-h-[420px] overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : budgetData.length > 0 ? (
                  budgetData.map((item, i) => {
                    const isBreached = item.percent > 100;
                    const isNearLimit = item.percent >= 75 && !isBreached;
                    return (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{item.name}</span>
                              <span className={cn(
                                "text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md",
                                isBreached 
                                  ? "bg-rose-100 text-rose-700 border border-rose-200" 
                                  : isNearLimit
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              )}>
                                {isBreached ? 'Breached' : isNearLimit ? 'Near Limit' : 'Safe'}
                              </span>
                            </div>
                            <span className="text-slate-500 text-[10px] font-semibold mt-0.5">
                              GUARDRAIL LIMIT: ₹{item.budget.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "font-black text-base",
                              isBreached ? "text-rose-600" : isNearLimit ? "text-amber-600" : "text-emerald-600"
                            )}>
                              ₹{item.spent.toLocaleString('en-IN')}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1 font-bold">({item.percent}%)</span>
                          </div>
                        </div>

                        <Progress 
                          value={Math.min(item.percent, 100)} 
                          className={cn(
                            "h-2 rounded-full",
                            isBreached 
                              ? "bg-rose-100 [&>div]:bg-rose-500" 
                              : isNearLimit
                              ? "bg-amber-100 [&>div]:bg-amber-500"
                              : "bg-emerald-100 [&>div]:bg-emerald-500"
                          )} 
                        />

                        {isBreached && (
                          <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <p className="text-[10px] text-rose-700 font-bold leading-tight">
                              Limit exceeded by ₹{(item.spent - item.budget).toLocaleString('en-IN')}. AI guardian recommends review.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium italic">
                    No budget activity detected.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border border-slate-200/90 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)] flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 shrink-0">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Activity Log</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Latest transactions & manual logs</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-white">
                  Recent
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[420px] pr-2">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => {
                      const merchant = cleanMerchantName(tx.description);
                      const isCleanDiff = merchant.toLowerCase() !== tx.description.trim().toLowerCase() && tx.description.length > 12;
                      return (
                        <div key={tx.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-white p-2 rounded-lg shrink-0 border border-slate-200/80 shadow-2xs">
                              <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-slate-900" title={tx.description}>
                                {isCleanDiff ? merchant : tx.description}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                <span className="font-semibold text-slate-700">{tx.category}</span>
                                {isCleanDiff && <span className="text-slate-400"> • {tx.description}</span>}
                                <span> • {tx.date}</span>
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-extrabold shrink-0 text-slate-900">
                            ₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-slate-400 font-medium italic">No recent transactions recorded.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Full Transaction Ledger */}
          <Card className="glass-card border border-slate-200/90 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-4 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 shrink-0">
                  <TableIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Transaction Ledger</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Detailed log of all financial records in range</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto text-[10px] font-semibold bg-slate-100 text-slate-700">
                {allTransactions.length} Total Records
              </Badge>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : allTransactions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 -mx-1 sm:mx-0">
                  <Table className="min-w-[480px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-slate-200/80">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600 w-24">Date</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Description</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600 w-28">Category</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right w-28">Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allTransactions.map((tx) => {
                        const merchant = cleanMerchantName(tx.description);
                        const isCleanDiff = merchant.toLowerCase() !== tx.description.trim().toLowerCase() && tx.description.length > 12;
                        return (
                          <TableRow key={tx.id} className="border-slate-200/60 hover:bg-blue-50/30 transition-colors">
                            <TableCell className="text-xs font-medium py-2.5 sm:py-3 text-slate-600 whitespace-nowrap">{tx.date}</TableCell>
                            <TableCell className="text-xs font-bold py-2.5 sm:py-3 max-w-[180px] sm:max-w-[260px] text-slate-900" title={tx.description}>
                              <div className="truncate">
                                <span>{isCleanDiff ? merchant : tx.description}</span>
                                {isCleanDiff && (
                                  <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">{tx.description}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2.5 sm:py-3">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                                {tx.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-extrabold py-2.5 sm:py-3 text-right text-slate-900 whitespace-nowrap">
                              ₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm font-medium italic">
                  No records found in this range.
                </div>
              )}
            </CardContent>
          </Card>
    </main>
  );
}
