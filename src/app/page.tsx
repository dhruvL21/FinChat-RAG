'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  Calendar,
  DollarSign,
  Loader2
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
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const chartData = [
  { name: 'Jan', spent: 2400 },
  { name: 'Feb', spent: 1398 },
  { name: 'Mar', spent: 9800 },
  { name: 'Apr', spent: 3908 },
  { name: 'May', spent: 4800 },
  { name: 'Jun', spent: 3800 },
];

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    async function load() {
      if (!user || !db) return;
      setIsLoading(true);
      try {
        const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
        const txs: Transaction[] = [];
        
        for (const docSnap of docsSnapshot.docs) {
          const chunksSnapshot = await getDocs(query(
            collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'),
            orderBy('transactionDate', 'desc'),
            limit(10)
          ));
          
          chunksSnapshot.forEach(chunk => {
            const data = chunk.data();
            if (data.amount !== undefined) {
              txs.push({
                id: chunk.id,
                date: data.transactionDate,
                description: data.chunkText.split(',')[1] || 'Transaction',
                amount: data.amount,
                category: data.category || 'Miscellaneous',
                sourceFile: docSnap.data().filename
              });
            }
          });
        }
        
        setRecentTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user, db]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold truncate">Overview</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2 text-xs md:text-sm font-medium whitespace-nowrap">
              <Calendar className="w-3 h-3 md:w-4 h-4" />
              <span className="hidden sm:inline">Oct 2023 - Mar 2024</span>
              <span className="sm:hidden">Current</span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Balance', value: '$12,450.00', trend: '+2.5%', icon: Wallet, color: 'text-primary' },
              { title: 'Monthly Spending', value: '$3,820.00', trend: '-10.2%', icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: '24%', trend: '+5.4%', icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: '$1,200.00', trend: 'Neutral', icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Link href="/insights" key={i} className="block transition-transform hover:scale-[1.02]">
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className={`text-xs mt-1 ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {stat.trend} from last month
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Spending Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>Spending Trends</CardTitle>
                <CardDescription>Monthly expenditure across all accounts</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] md:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 2 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest parsed transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/10 p-2 rounded-full shrink-0">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{tx.description}</p>
                            <p className="text-xs text-muted-foreground truncate">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No recent transactions found.</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a CSV to get started.</p>
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
