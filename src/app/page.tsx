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
import { cn } from '@/lib/utils';

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
    if (!user || !db || !dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const allTransactions: Transaction[] = [];
      
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
            allTransactions.push({
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
      
      const sorted = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(sorted.slice(0, 10));

      // Calculate Stats
      const totalSpent = allTransactions.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0);
      const totalIncome = allTransactions.reduce((acc, tx) => acc + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
      
      setStats({
        totalBalance: 12450 + (totalIncome - totalSpent), 
        monthlySpending: totalSpent,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0,
        projectedTax: totalIncome * 0.15 
      });

      const monthMap: Record<string, number> = {};
      allTransactions.forEach(tx => {
        const month = new Date(tx.date).toLocaleString('default', { month: 'short' });
        monthMap[month] = (monthMap[month] || 0) + (tx.amount > 0 ? tx.amount : 0);
      });

      const formattedChart = Object.entries(monthMap).map(([name, spent]) => ({ name, spent }));
      setChartData(formattedChart.length > 0 ? formattedChart : [{ name: 'No Data', spent: 0 }]);

    } catch (err) {
      console.error(err);
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
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold truncate">Overview</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
            <DatePickerWithRange onRangeChange={setDateRange} />
            <AddExpenseDialog />
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Total Balance', value: `$${stats.totalBalance.toLocaleString()}`, icon: Wallet, color: 'text-primary' },
              { title: 'Period Spending', value: `$${stats.monthlySpending.toLocaleString()}`, icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: `${stats.savingsRate}%`, icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: `$${stats.projectedTax.toLocaleString()}`, icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Link href="/insights" key={i} className="block transition-transform hover:scale-[1.01]">
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
                    <p className="text-[10px] md:text-xs mt-1 text-muted-foreground">
                      Calculated for selected range
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Spending Trends</CardTitle>
                <CardDescription>Monthly expenditure breakdown</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] md:h-[350px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dx={-10} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest transactions & manual entries</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
                <div className="space-y-4 md:space-y-5">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-muted pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/10 p-2 rounded-full shrink-0">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{tx.description}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold shrink-0 text-foreground">
                          ${Math.abs(tx.amount).toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No activity in this period.</p>
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
