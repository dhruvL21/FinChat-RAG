'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddExpenseDialog } from '@/components/finchat/add-expense-dialog';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
import { cn, parseCSVLine } from '@/lib/utils';
import { EditBudgetDialog } from '@/components/finchat/edit-budget-dialog';

const COLORS = ['#234EA8', '#6D3DDE', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1'];

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
            const parts = rawText.split(',');
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
        const matched = allExtractedTransactions.filter(tx => tx.date >= start && tx.date <= end);
        if (matched.length > 0) {
          activeTransactions = matched;
        }
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

      const normalizeCategory = (catStr: string): string => {
        const lower = (catStr || '').trim().toLowerCase();
        return categoryAliases[lower] || (catStr ? catStr.charAt(0).toUpperCase() + catStr.slice(1) : 'Miscellaneous');
      };

      const normalizedCatMap: Record<string, number> = {};
      const normalizedTransactions = activeTransactions.map(tx => {
        const normCat = normalizeCategory(tx.category || 'Miscellaneous');
        if (tx.amount > 0) {
          normalizedCatMap[normCat] = (normalizedCatMap[normCat] || 0) + tx.amount;
        }
        return { ...tx, category: normCat };
      });

      const sorted = [...normalizedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllTransactions(sorted);
      setRecentTransactions(sorted.slice(0, 10));

      const totalSpent = normalizedTransactions.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0);
      const totalIncome = normalizedTransactions.reduce((acc, tx) => acc + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
      
      const calculatedBalance = totalIncome > 0 ? Math.max(0, totalIncome - totalSpent) : Math.max(0, totalSpent);
      setStats({
        totalBalance: calculatedBalance, 
        monthlySpending: totalSpent,
        savingsRate: totalIncome > 0 
          ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalSpent) / totalIncome) * 100))) 
          : 0,
        projectedTax: Math.round(totalIncome * 0.15) 
      });

      // Monthly Chart Data
      const monthMap: Record<string, number> = {};
      normalizedTransactions.forEach(tx => {
        const month = tx.date ? new Date(tx.date).toLocaleString('default', { month: 'short' }) : 'Recent';
        monthMap[month] = (monthMap[month] || 0) + (tx.amount > 0 ? tx.amount : 0);
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <SidebarTrigger />
            <h2 className="text-lg font-bold truncate text-primary">Overview & Financial Intelligence</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 justify-end flex-shrink-0">
            <DatePickerWithRange onRangeChange={setDateRange} />
            <AddExpenseDialog />
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Total Balance', value: `₹${stats.totalBalance.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-primary' },
              { title: 'Period Spending', value: `₹${stats.monthlySpending.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: `${stats.savingsRate}%`, icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: `₹${stats.projectedTax.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-lg transition-all h-full bg-white/60 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-black text-foreground">{stat.value}</div>
                  <p className="text-[10px] md:text-xs mt-1 text-muted-foreground font-medium">
                    Live data from indexed statements
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 1: Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Spending Trends</CardTitle>
                <CardDescription>Visual breakdown of periodic expenditure</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px] pr-0">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                      />
                      <Bar dataKey="spent" radius={[6, 6, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shrink-0">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Expense Distribution</CardTitle>
                    <CardDescription className="text-xs font-medium">Categorized spending patterns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: '500' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-8 font-medium italic">
                    No data detected for this period. Upload a CSV to see distribution.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 2: AI Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-lg flex flex-col hover:shadow-primary/20 transition-all">
              <CardContent className="p-6 flex-1 flex flex-col">
                <ShieldCheck className="w-8 h-8 mb-4 opacity-40 shrink-0" />
                <h4 className="font-black text-sm uppercase tracking-wider mb-2">Limit Analysis</h4>
                <p className="text-xs opacity-90 leading-relaxed mb-6 flex-1 font-medium">
                  Deep-dive into specific items that caused your budget breaches this period.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-primary font-bold mt-auto" onClick={() => router.push('/chat?q=Analyze my spending in detail. Which specific items caused budget breaches?')}>
                  Analyze Items <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-accent text-accent-foreground shadow-lg flex flex-col hover:shadow-accent/20 transition-all">
              <CardContent className="p-6 flex-1 flex flex-col">
                <TrendingUp className="w-8 h-8 mb-4 opacity-40 shrink-0" />
                <h4 className="font-black text-sm uppercase tracking-wider mb-2">Leak Detection</h4>
                <p className="text-xs opacity-90 leading-relaxed mb-6 flex-1 font-medium">
                  "Miscellaneous" spending is trending up. Find the hidden waste in your logs.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-accent font-bold mt-auto" onClick={() => router.push('/chat?q=Show me a detailed breakdown of my miscellaneous expenses and identify potential waste.')}>
                  Find Leaks <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-white shadow-lg flex flex-col hover:shadow-black/5 transition-all">
              <CardContent className="p-6 flex-1 flex flex-col border border-muted rounded-lg">
                <PieChartIcon className="w-8 h-8 mb-4 text-primary opacity-20 shrink-0" />
                <h4 className="font-black text-sm uppercase tracking-wider mb-2 text-foreground">Recovery Protocol</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6 flex-1 font-medium">
                  Exceeded your monthly targets? Generate a strict AI-powered recovery plan.
                </p>
                <Button variant="outline" size="sm" className="w-full mt-auto font-bold border-primary/20 text-primary" onClick={() => router.push('/chat?q=I exceeded my monthly budget. Create a strict recovery plan for next month.')}>
                  Get Plan <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Section 3: Guardrails & Activity Log Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-xl border border-red-100 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Budget Guardrail</CardTitle>
                    <CardDescription className="text-xs font-medium">Real-time limit monitoring (INR)</CardDescription>
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
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : budgetData.length > 0 ? (
                  budgetData.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{item.name}</span>
                          <span className="text-muted-foreground text-[10px] font-bold">LIMIT: ₹{item.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "font-black text-base",
                            item.percent > 100 ? "text-red-600" : "text-green-600"
                          )}>
                            ₹{item.spent.toLocaleString('en-IN')}
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-1 font-bold">({item.percent}%)</span>
                        </div>
                      </div>
                      <Progress value={Math.min(item.percent, 100)} className={cn(
                        "h-2",
                        item.percent > 100 ? "bg-red-100 [&>div]:bg-red-500" : "bg-green-100 [&>div]:bg-green-500"
                      )} />
                      {item.percent > 100 && (
                        <div className="bg-red-50 border border-red-100 p-2 rounded-xl flex items-center gap-2 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <p className="text-[10px] text-red-700 font-bold leading-tight">
                            CRITICAL: Budget breached by ₹{(item.spent - item.budget).toLocaleString('en-IN')}! Ask AI for waste analysis.
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm font-medium italic">
                    No budget activity detected.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm flex flex-col h-full bg-white/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
                  <CardDescription>Latest transactions & manual logs</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[420px]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-muted pb-3.5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/5 p-2 rounded-xl shrink-0 border border-primary/10">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate text-foreground">{tx.description}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black shrink-0 text-foreground">
                          ₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground font-medium">No activity in this period.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Full Transaction Ledger */}
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                <TableIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Transaction Ledger</CardTitle>
                <CardDescription className="text-xs font-medium">Detailed log of all financial records in range</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : allTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-muted">
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Date</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Description</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Category</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allTransactions.map((tx) => (
                        <TableRow key={tx.id} className="border-muted hover:bg-white/40 transition-colors">
                          <TableCell className="text-xs font-medium py-3">{tx.date}</TableCell>
                          <TableCell className="text-xs font-bold py-3 truncate max-w-[220px]">{tx.description}</TableCell>
                          <TableCell className="text-xs py-3">
                            <span className="bg-primary/5 text-primary px-2 py-1 rounded-md text-[10px] font-bold border border-primary/10">
                              {tx.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-black py-3 text-right">
                            ₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm font-medium italic">
                  No records found.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
