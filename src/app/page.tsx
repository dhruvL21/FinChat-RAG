'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddExpenseDialog } from '@/components/finchat/add-expense-dialog';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  DollarSign,
  Loader2,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { Transaction } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';
import { cn, parseCSVLine } from '@/lib/utils';

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlySpending: 0,
    savingsRate: 0,
    projectedTax: 0
  });
  const [chartData, setChartData] = useState<{name: string, spent: number}[]>([]);
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

          // Ensure description is not mistakenly a date or ID
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
        setRecentTransactions([]);
        setStats({
          totalBalance: 250000,
          monthlySpending: 0,
          savingsRate: 0,
          projectedTax: 0
        });
        setChartData([{ name: 'No Data', spent: 0 }]);
        setIsLoading(false);
        return;
      }

      // Filter by date range if applicable, fallback to all transactions
      let activeTransactions = allExtractedTransactions;
      if (start && end) {
        const matched = allExtractedTransactions.filter(tx => tx.date >= start && tx.date <= end);
        if (matched.length > 0) {
          activeTransactions = matched;
        }
      }

      const sorted = [...activeTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(sorted.slice(0, 10));

      const totalSpent = activeTransactions.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0);
      const totalIncome = activeTransactions.reduce((acc, tx) => acc + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
      
      const baseBalance = 250000;
      setStats({
        totalBalance: baseBalance + (totalIncome - totalSpent), 
        monthlySpending: totalSpent,
        savingsRate: (totalIncome + baseBalance) > 0 
          ? Math.max(0, Math.min(100, Math.round(((totalIncome + baseBalance - totalSpent) / (totalIncome + baseBalance)) * 100))) 
          : 0,
        projectedTax: Math.round(totalIncome * 0.15) 
      });

      const monthMap: Record<string, number> = {};
      activeTransactions.forEach(tx => {
        const month = tx.date ? new Date(tx.date).toLocaleString('default', { month: 'short' }) : 'Recent';
        monthMap[month] = (monthMap[month] || 0) + (tx.amount > 0 ? tx.amount : 0);
      });

      const formattedChart = Object.entries(monthMap).map(([name, spent]) => ({ name, spent: Math.round(spent) }));
      setChartData(formattedChart.length > 0 ? formattedChart : [{ name: 'Total', spent: Math.round(totalSpent) }]);

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
            <h2 className="text-lg font-bold truncate text-primary">Overview</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 justify-end flex-shrink-0">
            <DatePickerWithRange onRangeChange={setDateRange} />
            <AddExpenseDialog />
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Total Balance', value: `₹${stats.totalBalance.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-primary' },
              { title: 'Period Spending', value: `₹${stats.monthlySpending.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: `${stats.savingsRate}%`, icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: `₹${stats.projectedTax.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Link href="/insights" key={i} className="block transition-all hover:scale-[1.02]">
                <Card className="border-none shadow-sm hover:shadow-lg transition-all h-full cursor-pointer bg-white/60 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-black text-foreground">{stat.value}</div>
                    <p className="text-[10px] md:text-xs mt-1 text-muted-foreground font-medium">
                      Live data for range
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Spending Trends</CardTitle>
                <CardDescription>Visual breakdown of your periodic expenditure</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] md:h-[400px] pr-0">
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

            <Card className="border-none shadow-sm flex flex-col h-full bg-white/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
                  <CardDescription>Latest transactions & manual logs</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[450px]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-muted pb-4 last:border-0 last:pb-0">
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
