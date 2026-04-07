'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Table as TableIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
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
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';
import type { Transaction } from '@/lib/types';

const COLORS = ['#234EA8', '#6D3DDE', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1'];

export default function InsightsPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryData, setCategoryData] = useState<{name: string, value: number, color: string}[]>([]);
  const [budgetData, setBudgetData] = useState<{name: string, spent: number, budget: number, percent: number}[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const loadInsights = useCallback(async () => {
    if (!user || !db || !dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const catMap: Record<string, number> = {};
      const transactions: Transaction[] = [];
      
      const start = dateRange.from.toISOString().split('T')[0];
      const end = dateRange.to.toISOString().split('T')[0];

      for (const docSnap of docsSnapshot.docs) {
        const chunksSnapshot = await getDocs(query(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'),
          where('transactionDate', '>=', start),
          where('transactionDate', '<=', end)
        ));
        
        chunksSnapshot.forEach(chunk => {
          const data = chunk.data();
          if (data.amount !== undefined) {
            const amount = data.amount;
            if (amount > 0) {
              const cat = data.category || 'Miscellaneous';
              catMap[cat] = (catMap[cat] || 0) + amount;
            }
            transactions.push({
              id: chunk.id,
              date: data.transactionDate,
              description: data.chunkText.split(',')[1]?.trim() || 'Transaction',
              amount: data.amount,
              category: data.category || 'Miscellaneous',
              sourceFile: docSnap.data().filename
            });
          }
        });
      }

      setAllTransactions(transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const formattedCat = Object.entries(catMap).map(([name, value], i) => ({
        name,
        value: Math.round(value),
        color: COLORS[i % COLORS.length]
      }));
      setCategoryData(formattedCat);

      const budgets: Record<string, number> = { 'Food': 600, 'Rent': 2000, 'Travel': 500, 'Shopping': 400, 'Utilities': 300 };
      const formattedBudget = Object.entries(budgets).map(([name, budget]) => {
        const spent = catMap[name] || 0;
        return {
          name,
          spent: Math.round(spent),
          budget,
          percent: Math.round((spent / budget) * 100)
        };
      });
      setBudgetData(formattedBudget);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, db, dateRange]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <SidebarTrigger />
            <h2 className="text-lg font-bold truncate text-primary">Financial Intelligence</h2>
          </div>
          <DatePickerWithRange onRangeChange={setDateRange} />
        </header>

        <main className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm h-full bg-white/60 backdrop-blur-sm">
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
              <CardContent className="h-[300px] md:h-[400px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: '500' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-8 font-medium italic">
                    No data detected for this period. Try uploading a CSV or adding manual expenses.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-full bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-xl border border-red-100 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Budget Guardrail</CardTitle>
                    <CardDescription className="text-xs font-medium">Real-time limit monitoring</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : budgetData.map((item, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{item.name}</span>
                        <span className="text-muted-foreground text-[10px] font-bold">LIMIT: ${item.budget}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-black text-lg",
                          item.percent > 100 ? "text-red-600" : "text-green-600"
                        )}>
                          ${item.spent}
                        </span>
                        <span className="text-muted-foreground text-[10px] ml-1 font-bold">({item.percent}%)</span>
                      </div>
                    </div>
                    <Progress value={Math.min(item.percent, 100)} className={cn(
                      "h-2.5",
                      item.percent > 100 ? "bg-red-100 [&>div]:bg-red-500" : "bg-green-100 [&>div]:bg-green-500"
                    )} />
                    {item.percent > 100 && (
                      <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-2 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <p className="text-[10px] text-red-700 font-bold leading-tight">
                          CRITICAL: Budget breached by ${item.spent - item.budget}! Ask AI to analyze specific waste items.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

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
                          <TableCell className="text-xs font-bold py-3 truncate max-w-[200px]">{tx.description}</TableCell>
                          <TableCell className="text-xs py-3">
                            <span className="bg-primary/5 text-primary px-2 py-1 rounded-md text-[10px] font-bold border border-primary/10">
                              {tx.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-black py-3 text-right">
                            ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-lg flex flex-col hover:shadow-primary/20 transition-all">
              <CardContent className="p-6 flex-1 flex flex-col">
                <ShieldCheck className="w-8 h-8 mb-4 opacity-40 shrink-0" />
                <h4 className="font-black text-sm uppercase tracking-wider mb-2">Limit Analysis</h4>
                <p className="text-xs opacity-90 leading-relaxed mb-6 flex-1 font-medium">
                  Deep-dive into specific items that caused your budget breaches this period.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-primary font-bold mt-auto" onClick={() => router.push('/chat?q=Analyze my food spending. Which specific items caused me to go over budget?')}>
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
                  Breached your total savings target? Generate a strict AI-powered recovery plan.
                </p>
                <Button variant="outline" size="sm" className="w-full mt-auto font-bold border-primary/20 text-primary" onClick={() => router.push('/chat?q=I exceeded my monthly budget. Create a strict recovery plan for next month.')}>
                  Get Plan <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
